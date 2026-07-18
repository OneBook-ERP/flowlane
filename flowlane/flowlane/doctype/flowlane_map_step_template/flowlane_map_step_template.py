# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FlowlaneMapStepTemplate(Document):
	def validate(self):
		self._ensure_unique_step_key()

	def _ensure_unique_step_key(self):
		duplicate = frappe.db.exists(
			"Flowlane Map Step Template",
			{
				"sub_process_template": self.sub_process_template,
				"step_key": self.step_key,
				"name": ("!=", self.name),
			},
		)
		if duplicate:
			frappe.throw(
				frappe._("Step Key {0} is already used in this sub process template.").format(
					frappe.bold(self.step_key)
				)
			)
