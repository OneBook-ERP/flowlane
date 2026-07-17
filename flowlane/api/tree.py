# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Hierarchy read APIs for the Flowlane workspace.

``get_clients`` feeds the Client Home grid (S1); ``get_client_tree`` feeds the
Client Workspace tree (S2) with the full L1 (Process) -> L2 (Sub Process) ->
L3 (Process Map) nesting. Both are read-only; writes go through frappe.client.
"""

import frappe


@frappe.whitelist()
def get_clients() -> list[dict]:
	"""Clients for the home grid, each with its process count for the tile."""
	clients = frappe.get_all(
		"Flowlane Client",
		fields=["name", "client_name", "industry_vertical", "status"],
		order_by="client_name asc",
	)
	for client in clients:
		client["process_count"] = frappe.db.count(
			"Flowlane Process", {"client": client["name"]}
		)
	return clients


@frappe.whitelist()
def get_client_tree(client: str) -> dict:
	"""Nested L1->L2->L3 structure for one client's workspace tree."""
	if not frappe.db.exists("Flowlane Client", client):
		frappe.throw(frappe._("Client {0} not found.").format(client))

	header = frappe.db.get_value(
		"Flowlane Client",
		client,
		["name", "client_name", "industry_vertical", "status"],
		as_dict=True,
	)
	header["processes"] = [_process_node(process) for process in _processes(client)]
	return header


def _processes(client: str) -> list[dict]:
	return frappe.get_all(
		"Flowlane Process",
		filters={"client": client},
		fields=["name", "process_name", "value_stream", "category", "status"],
		order_by="process_name asc",
	)


def _process_node(process: dict) -> dict:
	process["sub_processes"] = [
		_sub_process_node(sub) for sub in _sub_processes(process["name"])
	]
	return process


def _sub_processes(parent_process: str) -> list[dict]:
	return frappe.get_all(
		"Flowlane Sub Process",
		filters={"parent_process": parent_process},
		fields=["name", "title", "sequence", "description"],
		order_by="sequence asc, creation asc",
	)


def _sub_process_node(sub: dict) -> dict:
	sub["maps"] = _maps(sub["name"])
	return sub


def _maps(sub_process: str) -> list[dict]:
	return frappe.get_all(
		"Flowlane Process Map",
		filters={"sub_process": sub_process},
		fields=["name", "map_title", "map_type", "direction", "status", "version_label"],
		order_by="map_type asc, version_label asc",
	)
