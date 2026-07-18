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
		fields=["title", "sequence", "description"],
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
		_create_default_map(sub_process.name)


def _create_default_map(sub_process: str) -> None:
	# A consultant maps current-state before designing future-state (SPEC's
	# As-Is -> To-Be flow), so the seeded starting point is one As-Is map per
	# sub process, direction/status left to the doctype's own defaults
	# (Top-to-Bottom / Draft) so this stays in sync if those ever change.
	frappe.get_doc(
		{
			"doctype": "Flowlane Process Map",
			"sub_process": sub_process,
			"map_type": "As-Is",
		}
	).insert()
