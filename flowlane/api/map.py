# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Process Map graph helpers.

``validate_graph`` is a non-blocking checker (dangling edges, missing/extra Start
nodes, unreachable steps). ``get_map`` / ``save_steps`` are the Table tab's read
and bulk-write endpoints: one round-trip loads the header + steps + child rows,
and one transactional call upserts/deletes the whole step set.
"""

import base64
import json

import frappe
from frappe.utils.file_manager import save_file

# Scalar Map Step fields the Table tab reads and writes (everything except the
# child tables and the record name). Keep in sync with the frontend STEP_FIELDS.
STEP_FIELDS = (
	"step_id",
	"step_name",
	"lane_role",
	"node_type",
	"sequence",
	"trigger_input",
	"output_result",
	"erpnext_module",
	"erpnext_doctype",
	"workflow_state",
	"key_data_fields",
	"business_rules",
	"exceptions",
	"controls_approvals",
	"integrations",
	"kpis",
	"manual_x",
	"manual_y",
)


@frappe.whitelist()
def get_map(map: str) -> dict:
	"""Map header plus its steps, each with connections and pain points."""
	if not frappe.db.exists("Flowlane Process Map", map):
		frappe.throw(frappe._("Process Map {0} not found.").format(map))

	header = frappe.db.get_value(
		"Flowlane Process Map",
		map,
		["name", "map_title", "map_type", "direction", "status", "version_label", "sub_process"],
		as_dict=True,
	)
	return {"map": header, "steps": _load_steps(map)}


@frappe.whitelist()
def save_steps(map: str, steps) -> dict:
	"""Transactional bulk upsert/delete of a map's steps and their child rows.

	``steps`` is a JSON array of rows carrying a client ``uid``, an optional
	existing ``name``, the scalar fields, and ``connections`` keyed by target
	``to_uid``. New rows are inserted, changed rows updated, and any step missing
	from the payload is deleted — all in the single request transaction, so a
	server guard (duplicate ``step_id``, cross-map edge) rolls the whole save back.
	Returns ``uid_map`` (client uid -> saved name) plus the fresh map state.
	"""
	if not frappe.db.exists("Flowlane Process Map", map):
		frappe.throw(frappe._("Process Map {0} not found.").format(map))
	if isinstance(steps, str):
		steps = json.loads(steps)

	_delete_removed_steps(map, steps)
	uid_map = _upsert_steps(map, steps)
	result = get_map(map)
	result["uid_map"] = uid_map
	return result


def _load_steps(map: str) -> list[dict]:
	rows = frappe.get_all(
		"Flowlane Map Step",
		filters={"process_map": map},
		fields=["name", *STEP_FIELDS],
		order_by="sequence asc, creation asc",
	)
	for row in rows:
		row["connections"] = frappe.get_all(
			"Flowlane Step Connection",
			filters={"parenttype": "Flowlane Map Step", "parent": row["name"]},
			fields=["to_step", "label", "condition"],
			order_by="idx asc",
		)
		row["pain_points"] = frappe.get_all(
			"Flowlane Pain Point",
			filters={"parenttype": "Flowlane Map Step", "parent": row["name"]},
			fields=["description", "pain_type", "severity"],
			order_by="idx asc",
		)
	return rows


def _delete_removed_steps(map: str, steps: list[dict]) -> None:
	"""Delete steps that exist for the map but are absent from the payload."""
	keep = {s.get("name") for s in steps if s.get("name")}
	existing = frappe.get_all(
		"Flowlane Map Step", filters={"process_map": map}, pluck="name"
	)
	for name in existing:
		if name not in keep:
			# on_trash nulls inbound edges, so surviving rows keep no dangling refs.
			frappe.delete_doc("Flowlane Map Step", name)


def _upsert_steps(map: str, steps: list[dict]) -> dict:
	"""Create/update every step (scalars + pain points), then wire connections.

	Two passes: the first assigns names to new rows so the second can resolve each
	connection's ``to_uid`` to a real Map Step name within this map.
	"""
	uid_map = {}
	docs = []
	for step in steps:
		doc = _get_or_new(map, step)
		_apply_scalars(doc, step)
		_apply_pain_points(doc, step)
		doc.set("connections", [])
		doc.save()
		uid_map[step.get("uid")] = doc.name
		docs.append((doc, step))

	for doc, step in docs:
		_apply_connections(doc, step, uid_map)
	return uid_map


def _get_or_new(map: str, step: dict):
	name = step.get("name")
	if name and frappe.db.exists("Flowlane Map Step", name):
		return frappe.get_doc("Flowlane Map Step", name)
	doc = frappe.new_doc("Flowlane Map Step")
	doc.process_map = map
	return doc


def _apply_scalars(doc, step: dict) -> None:
	for field in STEP_FIELDS:
		if field in step:
			doc.set(field, step.get(field))


def _apply_pain_points(doc, step: dict) -> None:
	doc.set("pain_points", [])
	for point in step.get("pain_points") or []:
		if not point.get("description"):
			continue
		doc.append(
			"pain_points",
			{
				"description": point.get("description"),
				"pain_type": point.get("pain_type"),
				"severity": point.get("severity") or "Medium",
			},
		)


def _apply_connections(doc, step: dict, uid_map: dict) -> None:
	connections = step.get("connections") or []
	if not connections:
		return
	doc.set("connections", [])
	for conn in connections:
		target = uid_map.get(conn.get("to_uid"))
		if not target:
			continue  # target was deleted in this same save — drop the edge
		doc.append(
			"connections",
			{
				"to_step": target,
				"label": conn.get("label"),
				"condition": conn.get("condition"),
			},
		)
	doc.save()


@frappe.whitelist()
def set_thumbnail(map: str, png: str) -> str:
	"""Store a client-rendered PNG as the Process Map thumbnail (T3.4).

	``png`` is a base64 data URL (``data:image/png;base64,...``). The previous
	thumbnail file is removed so repeated saves do not pile up attachments.
	Returns the new file URL.
	"""
	if not frappe.db.exists("Flowlane Process Map", map):
		frappe.throw(frappe._("Process Map {0} not found.").format(map))

	content = base64.b64decode(png.split(",", 1)[-1])
	_clear_old_thumbnail(map)
	file = save_file(
		f"flowlane-map-{map}.png",
		content,
		"Flowlane Process Map",
		map,
		is_private=0,
	)
	frappe.db.set_value("Flowlane Process Map", map, "thumbnail", file.file_url)
	return file.file_url


def _clear_old_thumbnail(map: str) -> None:
	old = frappe.db.get_value("Flowlane Process Map", map, "thumbnail")
	if not old:
		return
	for name in frappe.get_all("File", filters={"file_url": old}, pluck="name"):
		frappe.delete_doc("File", name, ignore_permissions=True, force=True)


@frappe.whitelist()
def validate_graph(map: str) -> list[str]:
	"""Return warnings for a process map's step graph. Never blocks a save."""
	steps = frappe.get_all(
		"Flowlane Map Step",
		filters={"process_map": map},
		fields=["name", "step_id", "node_type"],
	)
	if not steps:
		return []

	warnings = []
	warnings += _check_start_nodes(steps)
	warnings += _check_edges(map, steps)

	for warning in warnings:
		frappe.msgprint(warning, title=frappe._("Map Warning"), indicator="orange")
	return warnings


def _check_start_nodes(steps: list[dict]) -> list[str]:
	start_types = _start_node_types()
	start_steps = [s for s in steps if s.node_type in start_types]
	if not start_steps:
		return [frappe._("No Start node found in this map.")]
	if len(start_steps) > 1:
		return [frappe._("More than one Start node found in this map.")]
	return []


def _check_edges(map: str, steps: list[dict]) -> list[str]:
	"""Flag edges pointing outside the map and steps nothing reaches."""
	step_names = {s.name for s in steps}
	edges = frappe.get_all(
		"Flowlane Step Connection",
		filters={"parenttype": "Flowlane Map Step", "parent": ("in", list(step_names))},
		fields=["parent", "to_step"],
	)

	warnings = []
	adjacency = {name: [] for name in step_names}
	for edge in edges:
		if edge.to_step and edge.to_step not in step_names:
			warnings.append(
				frappe._("Connection to {0} points outside this map.").format(edge.to_step)
			)
			continue
		if edge.to_step:
			adjacency[edge.parent].append(edge.to_step)

	warnings += _unreachable_warnings(map, steps, adjacency)
	return warnings


def _unreachable_warnings(
	map: str, steps: list[dict], adjacency: dict[str, list[str]]
) -> list[str]:
	start_types = _start_node_types()
	roots = [s.name for s in steps if s.node_type in start_types]
	if not roots:
		return []

	reachable = set()
	stack = list(roots)
	while stack:
		node = stack.pop()
		if node in reachable:
			continue
		reachable.add(node)
		stack.extend(adjacency.get(node, []))

	unreachable = [s.step_id for s in steps if s.name not in reachable]
	if unreachable:
		return [
			frappe._("Unreachable steps: {0}.").format(", ".join(sorted(unreachable)))
		]
	return []


def _start_node_types() -> set[str]:
	return set(
		frappe.get_all("Flowlane Node Type", filters={"is_start": 1}, pluck="name")
	)
