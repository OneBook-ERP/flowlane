# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from flowlane.api import summary as api


class TestGetClientSummary(IntegrationTestCase):
	def setUp(self):
		self.client = self._insert(
			{"doctype": "Flowlane Client", "client_name": frappe.generate_hash(length=10)}
		)

	def _insert(self, values):
		doc = frappe.get_doc(values).insert()
		self.addCleanup(lambda: frappe.delete_doc(doc.doctype, doc.name, force=True))
		return doc

	def test_empty_client_has_zeroed_counts(self):
		result = api.get_client_summary(self.client.name)
		self.assertEqual(result["counts"], {"processes": 0, "sub_processes": 0, "maps": 0})
		self.assertEqual(result["map_status"], {"Draft": 0, "In Review": 0, "Approved": 0})
		self.assertEqual(result["pain_points"], {"total": 0, "Low": 0, "Medium": 0, "High": 0})
		self.assertEqual(result["modules_in_use"], [])
		self.assertEqual(result["client"]["name"], self.client.name)

	def test_counts_processes_subs_and_maps(self):
		process = self._insert(
			{"doctype": "Flowlane Process", "client": self.client.name, "process_name": "Quote to Cash"}
		)
		sub = self._insert(
			{"doctype": "Flowlane Sub Process", "parent_process": process.name, "title": "Lead Mgmt"}
		)
		self._insert(
			{
				"doctype": "Flowlane Process Map",
				"sub_process": sub.name,
				"map_type": "As-Is",
				"status": "In Review",
			}
		)
		self._insert(
			{
				"doctype": "Flowlane Process Map",
				"sub_process": sub.name,
				"map_type": "To-Be",
				"status": "Approved",
			}
		)

		result = api.get_client_summary(self.client.name)
		self.assertEqual(result["counts"], {"processes": 1, "sub_processes": 1, "maps": 2})
		self.assertEqual(
			result["map_status"], {"Draft": 0, "In Review": 1, "Approved": 1}
		)

	def test_pain_point_and_module_aggregation(self):
		process = self._insert(
			{"doctype": "Flowlane Process", "client": self.client.name, "process_name": "Procure to Pay"}
		)
		sub = self._insert(
			{"doctype": "Flowlane Sub Process", "parent_process": process.name, "title": "Requisition"}
		)
		process_map = self._insert(
			{"doctype": "Flowlane Process Map", "sub_process": sub.name, "map_type": "As-Is"}
		)
		step = frappe.get_doc(
			{
				"doctype": "Flowlane Map Step",
				"process_map": process_map.name,
				"step_id": "S1",
				"step_name": "Raise PR",
				"lane_role": "Sales Executive",
				"node_type": "Process/Task",
				"erpnext_module": "Buying",
			}
		)
		step.append("pain_points", {"description": "Manual approval", "severity": "High"})
		step.append("pain_points", {"description": "Slow turnaround", "severity": "Medium"})
		step.insert()
		self.addCleanup(lambda: frappe.delete_doc("Flowlane Map Step", step.name, force=True))

		other_step = frappe.get_doc(
			{
				"doctype": "Flowlane Map Step",
				"process_map": process_map.name,
				"step_id": "S2",
				"step_name": "Approve PR",
				"lane_role": "Sales Executive",
				"node_type": "Process/Task",
				"erpnext_module": "Buying",
			}
		).insert()
		self.addCleanup(lambda: frappe.delete_doc("Flowlane Map Step", other_step.name, force=True))

		result = api.get_client_summary(self.client.name)
		self.assertEqual(
			result["pain_points"], {"total": 2, "Low": 0, "Medium": 1, "High": 1}
		)
		self.assertEqual(result["modules_in_use"], ["Buying"])

	def test_unknown_client_raises(self):
		with self.assertRaises(frappe.ValidationError):
			api.get_client_summary("Not A Real Client")
