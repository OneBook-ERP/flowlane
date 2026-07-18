# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from flowlane.api import templates as api


class TestApplyTemplates(IntegrationTestCase):
	def setUp(self):
		self.client = self._insert(
			{"doctype": "Flowlane Client", "client_name": frappe.generate_hash(length=10)}
		)

	def _insert(self, values):
		doc = frappe.get_doc(values).insert()
		self.addCleanup(lambda: frappe.delete_doc(doc.doctype, doc.name, force=True))
		return doc

	def test_creates_process_and_sub_processes_from_template(self):
		result = api.apply_templates(self.client.name, ["Selling"])
		self.assertEqual(result["created"], ["Quote-to-Cash"])
		self.assertEqual(result["skipped"], [])

		process = frappe.get_doc(
			"Flowlane Process", {"client": self.client.name, "process_name": "Quote-to-Cash"}
		)
		self.addCleanup(lambda: frappe.delete_doc(process.doctype, process.name, force=True))
		subs = frappe.get_all(
			"Flowlane Sub Process",
			filters={"parent_process": process.name},
			pluck="title",
			order_by="sequence asc",
		)
		self.addCleanup(
			lambda: [
				frappe.delete_doc("Flowlane Sub Process", s, force=True)
				for s in frappe.get_all(
					"Flowlane Sub Process", filters={"parent_process": process.name}, pluck="name"
				)
			]
		)
		self.assertEqual(
			subs,
			[
				"Lead Management", "Opportunity & Quotation", "Order Booking",
				"Fulfilment", "Invoicing & Collections",
			],
		)

	def test_reapplying_same_module_skips_existing_process(self):
		first = api.apply_templates(self.client.name, ["Buying"])
		self.assertEqual(first["created"], ["Procure-to-Pay"])
		self._cleanup_process("Procure-to-Pay")

		second = api.apply_templates(self.client.name, ["Buying"])
		self.assertEqual(second["created"], [])
		self.assertEqual(second["skipped"], ["Procure-to-Pay"])

		# No duplicate process was created by the second call.
		count = frappe.db.count(
			"Flowlane Process", {"client": self.client.name, "process_name": "Procure-to-Pay"}
		)
		self.assertEqual(count, 1)

	def _cleanup_process(self, process_name):
		name = frappe.db.get_value(
			"Flowlane Process", {"client": self.client.name, "process_name": process_name}
		)
		if not name:
			return
		self.addCleanup(lambda: frappe.delete_doc("Flowlane Process", name, force=True))
		for sub in frappe.get_all("Flowlane Sub Process", filters={"parent_process": name}, pluck="name"):
			self.addCleanup(lambda s=sub: frappe.delete_doc("Flowlane Sub Process", s, force=True))

	def test_unknown_client_raises(self):
		with self.assertRaises(frappe.ValidationError):
			api.apply_templates("Not A Real Client", ["Selling"])
