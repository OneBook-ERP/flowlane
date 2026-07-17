# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FlowlaneProcess(Document):
	def validate(self):
		self._ensure_unique_name()

	def _ensure_unique_name(self):
		duplicate = frappe.db.exists(
			"Flowlane Process",
			{
				"client": self.client,
				"process_name": self.process_name,
				"name": ("!=", self.name),
			},
		)
		if duplicate:
			frappe.throw(
				frappe._("Process {0} already exists for this client.").format(
					frappe.bold(self.process_name)
				)
			)

	def on_trash(self):
		if frappe.db.exists("Flowlane Sub Process", {"parent_process": self.name}):
			frappe.throw(
				frappe._("Remove this process's sub processes before deleting it.")
			)
