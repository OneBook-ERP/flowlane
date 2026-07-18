# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from flowlane.api import templates as api
from flowlane.process_catalog import CATALOG


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
		self._cleanup_process("Quote-to-Cash")
		subs = frappe.get_all(
			"Flowlane Sub Process",
			filters={"parent_process": process.name},
			pluck="title",
			order_by="sequence asc",
		)
		self.assertEqual(
			subs,
			[
				"Lead Management", "Opportunity & Quotation", "Order Booking",
				"Fulfilment", "Invoicing & Collections",
			],
		)

	def test_creates_a_default_as_is_map_per_sub_process(self):
		# A consultant maps current-state before future-state, so every
		# seeded sub process should start with exactly one As-Is map (not
		# zero — that would leave the tree with nothing to click into).
		api.apply_templates(self.client.name, ["Manufacturing"])
		self._cleanup_process("Plan-to-Produce")

		process = frappe.db.get_value(
			"Flowlane Process", {"client": self.client.name, "process_name": "Plan-to-Produce"}
		)
		subs = frappe.get_all("Flowlane Sub Process", filters={"parent_process": process}, pluck="name")
		self.assertEqual(len(subs), 4)
		for sub in subs:
			maps = frappe.get_all(
				"Flowlane Process Map", filters={"sub_process": sub}, fields=["map_type", "direction", "status"]
			)
			self.assertEqual(len(maps), 1)
			self.assertEqual(maps[0].map_type, "As-Is")
			self.assertEqual(maps[0].direction, "Top-to-Bottom")
			self.assertEqual(maps[0].status, "Draft")

	def test_applying_module_creates_maps_with_matching_step_counts(self):
		api.apply_templates(self.client.name, ["Manufacturing"])
		self._cleanup_process("Plan-to-Produce")

		process = frappe.db.get_value(
			"Flowlane Process", {"client": self.client.name, "process_name": "Plan-to-Produce"}
		)
		subs = frappe.get_all(
			"Flowlane Sub Process", filters={"parent_process": process}, fields=["name", "title"]
		)
		self.assertEqual(len(subs), 4)
		for sub in subs:
			expected = len(CATALOG["Manufacturing"][sub.title])
			map_name = frappe.db.get_value("Flowlane Process Map", {"sub_process": sub.name}, "name")
			step_count = frappe.db.count("Flowlane Map Step", {"process_map": map_name})
			self.assertEqual(
				step_count, expected, f"{sub.title} expected {expected} steps, got {step_count}"
			)

	def test_decision_branches_resolve_to_correct_targets_and_labels(self):
		# Selling's Opportunity & Quotation S3 "Approve Discount?" ->
		# Yes->S5 (Send Quotation), No->S4 (Revise Quotation).
		api.apply_templates(self.client.name, ["Selling"])
		self._cleanup_process("Quote-to-Cash")

		process = frappe.db.get_value(
			"Flowlane Process", {"client": self.client.name, "process_name": "Quote-to-Cash"}
		)
		sub_process = frappe.db.get_value(
			"Flowlane Sub Process", {"parent_process": process, "title": "Opportunity & Quotation"}
		)
		map_name = frappe.db.get_value("Flowlane Process Map", {"sub_process": sub_process}, "name")
		step_s3 = frappe.get_doc("Flowlane Map Step", {"process_map": map_name, "step_id": "S3"})
		self.assertEqual(step_s3.step_name, "Approve Discount?")

		resolved = {
			c.label: frappe.db.get_value("Flowlane Map Step", c.to_step, "step_id")
			for c in step_s3.connections
		}
		self.assertEqual(resolved, {"Yes": "S5", "No": "S4"})

	def test_reapplying_does_not_duplicate_steps(self):
		api.apply_templates(self.client.name, ["Buying"])
		self._cleanup_process("Procure-to-Pay")
		api.apply_templates(self.client.name, ["Buying"])  # skipped, process already exists

		process = frappe.db.get_value(
			"Flowlane Process", {"client": self.client.name, "process_name": "Procure-to-Pay"}
		)
		sub_process = frappe.db.get_value(
			"Flowlane Sub Process", {"parent_process": process, "title": "Payment"}
		)
		map_name = frappe.db.get_value("Flowlane Process Map", {"sub_process": sub_process}, "name")
		step_count = frappe.db.count("Flowlane Map Step", {"process_map": map_name})
		self.assertEqual(step_count, len(CATALOG["Buying"]["Payment"]))

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
		subs = frappe.get_all("Flowlane Sub Process", filters={"parent_process": name}, pluck="name")
		for sub in subs:
			# Delete order matters: Sub Process.on_trash blocks while a Process
			# Map exists under it, and Process.on_trash blocks while a Sub
			# Process exists — so maps must go first, subs second (addCleanup
			# runs LIFO, so register maps-for-this-sub AFTER the sub itself).
			self.addCleanup(lambda s=sub: frappe.delete_doc("Flowlane Sub Process", s, force=True))
			maps = frappe.get_all("Flowlane Process Map", filters={"sub_process": sub}, pluck="name")
			for map_name in maps:
				self.addCleanup(lambda m=map_name: frappe.delete_doc("Flowlane Process Map", m, force=True))

	def test_unknown_client_raises(self):
		with self.assertRaises(frappe.ValidationError):
			api.apply_templates("Not A Real Client", ["Selling"])
