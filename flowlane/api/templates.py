# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Client onboarding via process templates.

Seeded ``Flowlane Process Template`` rows (one per ERPNext module, see
``flowlane.setup._seed_process_templates``) are a starting skeleton of
Process + Sub Process records a consultant can apply to a brand-new client
instead of mapping from a blank tree. ``get_templates`` feeds a picker UI;
``apply_templates`` does the actual create.

Atomicity: a whitelisted method that raises lets Frappe's request handler
roll back the whole request (see ``frappe.app.application`` /
``frappe.db.rollback`` on exception) — the same guarantee ``map.save_steps``
relies on. We don't need a hand-rolled savepoint here because nothing in
``apply_templates`` catches its own exceptions; any insert failure aborts
the request and undoes every insert made so far in it.
"""

import frappe


@frappe.whitelist()
def get_templates() -> list[dict]:
	"""All Process Templates with their sub-process rows, for a picker UI."""
	templates = frappe.get_all(
		"Flowlane Process Template",
		fields=["name", "module", "process_name", "value_stream", "category", "description", "sequence"],
		order_by="module asc, sequence asc, process_name asc",
	)
	for template in templates:
		template["sub_process_templates"] = frappe.get_all(
			"Flowlane Sub Process Template",
			filters={"parenttype": "Flowlane Process Template", "parent": template["name"]},
			fields=["title", "sequence", "description"],
			order_by="idx asc",
		)
	return templates


@frappe.whitelist()
def apply_templates(client: str, modules: list[str]) -> dict:
	"""Create the Process/Sub Process skeleton for each selected module.

	Idempotent per module: a template whose ``process_name`` already exists
	for this client is skipped rather than duplicated, so re-applying (e.g.
	the same module picked twice, or a retry) is harmless.
	"""
	if not frappe.db.exists("Flowlane Client", client):
		frappe.throw(frappe._("Client {0} not found.").format(client))
	if isinstance(modules, str):
		modules = frappe.parse_json(modules)

	created, skipped = [], []
	for template in _templates_for_modules(modules):
		if frappe.db.exists("Flowlane Process", {"client": client, "process_name": template.process_name}):
			skipped.append(template.process_name)
			continue
		_create_process_from_template(client, template)
		created.append(template.process_name)

	return {"created": created, "skipped": skipped}


def _templates_for_modules(modules: list[str]) -> list:
	if not modules:
		return []
	return frappe.get_all(
		"Flowlane Process Template",
		filters={"module": ("in", modules)},
		fields=["name", "process_name", "value_stream", "category", "description"],
		order_by="module asc, sequence asc, process_name asc",
	)


def _create_process_from_template(client: str, template) -> None:
	process = frappe.get_doc(
		{
			"doctype": "Flowlane Process",
			"client": client,
			"process_name": template.process_name,
			"value_stream": template.value_stream,
			"category": template.category,
			"description": template.description,
		}
	).insert()
	_create_sub_processes(process.name, template.name)


def _create_sub_processes(process: str, template_name: str) -> None:
	rows = frappe.get_all(
		"Flowlane Sub Process Template",
		filters={"parenttype": "Flowlane Process Template", "parent": template_name},
		fields=["name", "title", "sequence", "description"],
		order_by="idx asc",
	)
	for row in rows:
		sub_process = frappe.get_doc(
			{
				"doctype": "Flowlane Sub Process",
				"parent_process": process,
				"title": row.title,
				"sequence": row.sequence,
				"description": row.description,
			}
		).insert()
		_create_default_map(sub_process.name, row.name)


def _create_default_map(sub_process: str, sub_process_template: str) -> None:
	# A consultant maps current-state before designing future-state (SPEC's
	# As-Is -> To-Be flow), so the seeded starting point is one As-Is map per
	# sub process, direction/status left to the doctype's own defaults
	# (Top-to-Bottom / Draft) so this stays in sync if those ever change.
	process_map = frappe.get_doc(
		{
			"doctype": "Flowlane Process Map",
			"sub_process": sub_process,
			"map_type": "As-Is",
		}
	).insert()
	_populate_map_steps(process_map.name, sub_process_template)


def _populate_map_steps(process_map: str, sub_process_template: str) -> None:
	"""Copy the template's steps + connections onto the new map.

	Two passes, same shape as ``map.save_steps``' uid->name resolution: a
	step_key is only stable within its own template, so every step must exist
	as a real Map Step (with a real ``name``) before any connection can point
	at one.
	"""
	step_templates = frappe.get_all(
		"Flowlane Map Step Template",
		filters={"sub_process_template": sub_process_template},
		fields=["name", "step_key", "step_name", "lane_role", "node_type", "sequence"],
		order_by="sequence asc",
	)

	step_key_to_step = {}
	for template in step_templates:
		step_key_to_step[template.step_key] = frappe.get_doc(
			{
				"doctype": "Flowlane Map Step",
				"process_map": process_map,
				"step_id": template.step_key,
				"step_name": template.step_name,
				"lane_role": template.lane_role,
				"node_type": template.node_type,
				"sequence": template.sequence,
			}
		).insert()

	for template in step_templates:
		_apply_step_connections(template, step_key_to_step)


def _apply_step_connections(template, step_key_to_step: dict) -> None:
	connections = frappe.get_all(
		"Flowlane Map Step Template Connection",
		filters={"parenttype": "Flowlane Map Step Template", "parent": template.name},
		fields=["to_step_key", "label"],
		order_by="idx asc",
	)
	if not connections:
		return
	step = step_key_to_step[template.step_key]
	for connection in connections:
		target = step_key_to_step.get(connection.to_step_key)
		if not target:
			# The template's own steps are internally consistent by
			# construction (flowlane.process_catalog) -- an unresolved key
			# here means the source template itself was miswired.
			frappe.throw(
				frappe._(
					"Template step {0} connects to unknown step key {1} — the source template {2} is inconsistent."
				).format(
					frappe.bold(template.step_key), frappe.bold(connection.to_step_key), template.name
				)
			)
		step.append("connections", {"to_step": target.name, "label": connection.label})
	step.save()
