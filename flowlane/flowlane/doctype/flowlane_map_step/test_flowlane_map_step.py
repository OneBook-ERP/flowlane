# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase


class TestFlowlaneMapStep(IntegrationTestCase):
	def setUp(self):
		self.map = self._build_map()

	def _build_map(self):
		client = self._insert(
			{"doctype": "Flowlane Client", "client_name": frappe.generate_hash(length=10)}
		)
		process = self._insert(
			{"doctype": "Flowlane Process", "client": client.name, "process_name": "P1"}
		)
		sub = self._insert(
			{"doctype": "Flowlane Sub Process", "parent_process": process.name, "title": "SP1"}
		)
		return self._insert(
			{
				"doctype": "Flowlane Process Map",
				"sub_process": sub.name,
				"map_type": "As-Is",
			}
		)

	def _insert(self, values):
		doc = frappe.get_doc(values).insert()
		self.addCleanup(lambda: frappe.delete_doc(doc.doctype, doc.name, force=True))
		return doc

	def _step(self, step_id, connections=None):
		doc = frappe.get_doc(
			{
				"doctype": "Flowlane Map Step",
				"process_map": self.map.name,
				"step_id": step_id,
				"step_name": f"Do {step_id}",
				"lane_role": "Sales Executive",
				"node_type": "Process/Task",
				"connections": connections or [],
			}
		).insert()
		self.addCleanup(lambda: frappe.delete_doc(doc.doctype, doc.name, force=True))
		return doc

	def test_deleting_step_nulls_inbound_connections(self):
		target = self._step("S2")
		source = self._step("S1", connections=[{"to_step": target.name, "label": "next"}])

		# Sanity: the edge points at the target before deletion.
		self.assertEqual(source.connections[0].to_step, target.name)

		frappe.delete_doc("Flowlane Map Step", target.name, force=True)

		to_step = frappe.db.get_value(
			"Flowlane Step Connection", source.connections[0].name, "to_step"
		)
		self.assertFalse(to_step, "Inbound connection should be nulled, not dangling")

	def test_duplicate_step_id_blocked(self):
		self._step("S1")
		with self.assertRaises(frappe.ValidationError):
			self._step("S1")
