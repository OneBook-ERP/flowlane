# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Process Map graph helpers.

Phase 0 ships only ``validate_graph`` as a non-blocking checker: it surfaces
warnings (dangling edges, missing/extra Start nodes, unreachable steps) but never
raises. Bulk step save/load APIs arrive in later phases.
"""

import frappe


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
