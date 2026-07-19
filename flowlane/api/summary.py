# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Client-level aggregation for the workspace summary dashboard (BACKLOG 2.1).

``get_client_summary`` feeds ``ClientSummary.vue`` — the view shown when
nothing is selected in the tree. It is read-only and bounded to a handful of
filtered/grouped queries (never one query per process/sub-process/map), so it
stays cheap regardless of how large a client's tree grows.

Two things this intentionally does NOT show, because the data doesn't exist
yet: a real "mapping start date" (no such field — the client's own
``creation`` timestamp is used as a proxy, see BACKLOG.md) and real version
history (only a plain ``status`` field exists today — see item 5.1, parked).
"""

from collections import Counter

import frappe


@frappe.whitelist()
def get_client_summary(client: str) -> dict:
	"""Counts, pain-point/status breakdowns, and module usage for one client."""
	if not frappe.db.exists("Flowlane Client", client):
		frappe.throw(frappe._("Client {0} not found.").format(client))

	process_names = frappe.get_all("Flowlane Process", filters={"client": client}, pluck="name")
	sub_process_names = _sub_process_names(process_names)
	map_names = _map_names(sub_process_names)

	return {
		"client": _client_header(client),
		"counts": {
			"processes": len(process_names),
			"sub_processes": len(sub_process_names),
			"maps": len(map_names),
		},
		"map_status": _map_status_breakdown(sub_process_names),
		"pain_points": _pain_point_breakdown(map_names),
		"modules_in_use": _modules_in_use(map_names),
	}


def _client_header(client: str) -> dict:
	return frappe.db.get_value(
		"Flowlane Client",
		client,
		["name", "client_name", "industry_vertical", "status", "creation", "mapping_deadline"],
		as_dict=True,
	)


def _sub_process_names(process_names: list[str]) -> list[str]:
	if not process_names:
		return []
	return frappe.get_all(
		"Flowlane Sub Process", filters={"parent_process": ["in", process_names]}, pluck="name"
	)


def _map_names(sub_process_names: list[str]) -> list[str]:
	if not sub_process_names:
		return []
	return frappe.get_all(
		"Flowlane Process Map", filters={"sub_process": ["in", sub_process_names]}, pluck="name"
	)


def _map_status_breakdown(sub_process_names: list[str]) -> dict:
	"""Draft / In Review / Approved counts.

	One query pulling just the status column, grouped in Python — `get_all`
	rejects raw SQL aggregate strings (function-string injection guard), and
	a client's map count is small enough that Python-side counting is still
	a single round trip, not a loop of queries.
	"""
	counts = {"Draft": 0, "In Review": 0, "Approved": 0}
	if not sub_process_names:
		return counts
	statuses = frappe.get_all(
		"Flowlane Process Map", filters={"sub_process": ["in", sub_process_names]}, pluck="status"
	)
	counts.update(Counter(statuses))
	return {key: counts.get(key, 0) for key in ("Draft", "In Review", "Approved")}


def _pain_point_breakdown(map_names: list[str]) -> dict:
	"""Low / Medium / High counts (+ total) across every step of every map."""
	counts = {"total": 0, "Low": 0, "Medium": 0, "High": 0}
	if not map_names:
		return counts
	step_names = frappe.get_all(
		"Flowlane Map Step", filters={"process_map": ["in", map_names]}, pluck="name"
	)
	if not step_names:
		return counts
	severities = frappe.get_all(
		"Flowlane Pain Point",
		filters={"parenttype": "Flowlane Map Step", "parent": ["in", step_names]},
		pluck="severity",
	)
	tally = Counter(severities)
	for severity in ("Low", "Medium", "High"):
		counts[severity] = tally.get(severity, 0)
		counts["total"] += tally.get(severity, 0)
	return counts


def _modules_in_use(map_names: list[str]) -> list[str]:
	"""Distinct non-blank ``erpnext_module`` values referenced by this
	client's Map Steps — the closest thing to a stored "modules in use"
	record today (see BACKLOG 2.1: nothing tracks this more directly)."""
	if not map_names:
		return []
	rows = frappe.get_all(
		"Flowlane Map Step",
		filters={"process_map": ["in", map_names], "erpnext_module": ["!=", ""]},
		fields=["erpnext_module"],
		distinct=True,
	)
	return sorted({row.erpnext_module for row in rows})
