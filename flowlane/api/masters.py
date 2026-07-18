# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Master datasets for the SPA dropdowns.

One round-trip (`get_masters`) returns every seeded reference list the create/edit
dialogs need, so the frontend fetches them once and reuses them. Each list is a
``[{"label", "value"}]`` shaped for frappe-ui Select/Autocomplete.
"""

import frappe

# Master doctype -> the naming field that also serves as label + value.
_MASTERS = {
	"value_stream": ("Flowlane Value Stream", "value_stream_name"),
	"category": ("Flowlane Process Category", "category_name"),
	"industry_vertical": ("Flowlane Industry Vertical", "vertical_name"),
	"node_type": ("Flowlane Node Type", "node_type_name"),
	"lane_role": ("Flowlane Lane Role", "role_name"),
	"erpnext_module": ("Flowlane ERPNext Module", "module_name"),
	"pain_point_type": ("Flowlane Pain Point Type", "type_name"),
}


@frappe.whitelist()
def get_masters() -> dict[str, list[dict]]:
	"""All dropdown datasets in one call, keyed by the field they populate."""
	return {key: _options(doctype) for key, (doctype, _) in _MASTERS.items()}


@frappe.whitelist()
def get_diagram_meta() -> dict:
	"""Lookups the swimlane engine needs but the plain dropdowns omit:

	``node_shapes`` maps a Node Type name -> its shape, and ``lane_order`` maps a
	Lane Role name -> its ``sort_order`` (used to order lane bands). Fetched once
	by the Diagram tab and passed into ``generateSwimlane``.
	"""
	shapes = frappe.get_all(
		"Flowlane Node Type", fields=["name", "shape"]
	)
	roles = frappe.get_all(
		"Flowlane Lane Role", fields=["name", "sort_order"]
	)
	return {
		"node_shapes": {row.name: row.shape for row in shapes},
		"lane_order": {row.name: row.sort_order or 0 for row in roles},
	}


def _options(doctype: str) -> list[dict]:
	names = frappe.get_all(doctype, pluck="name", order_by="name asc")
	return [{"label": name, "value": name} for name in names]
