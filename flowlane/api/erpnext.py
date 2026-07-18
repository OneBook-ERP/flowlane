# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""ERPNext metadata lookups for the Table tab dropdowns.

The Map Step ``erpnext_doctype`` cell is a live DocType picker (no master — the
DocType list is metadata). ``get_doctypes`` returns the selectable, real DocTypes
as ``[{label, value}]`` for a frappe-ui Combobox; an optional ``module`` narrows
the list to one ERPNext module.
"""

import frappe


@frappe.whitelist()
def get_doctypes(module: str | None = None) -> list[dict]:
	"""Selectable DocTypes (no child tables, single, or virtual doctypes)."""
	filters = {"istable": 0, "issingle": 0, "custom": 0}
	if module and frappe.db.exists("Module Def", module):
		filters["module"] = module
	names = frappe.get_all("DocType", filters=filters, pluck="name", order_by="name asc")
	return [{"label": name, "value": name} for name in names]
