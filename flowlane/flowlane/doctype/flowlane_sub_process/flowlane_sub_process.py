# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FlowlaneSubProcess(Document):
	def before_insert(self):
		if not self.sequence:
			self.sequence = self._next_sequence()

	def validate(self):
		self._ensure_unique_title()

	def _next_sequence(self):
		# `parent_process` (not `process`): the fieldname `process` collides with
		# frappe Meta.process() and cannot be used as a docfield name.
		highest = frappe.db.sql(
			"select max(sequence) from `tabFlowlane Sub Process` where parent_process = %s",
			self.parent_process,
		)
		return (highest[0][0] or 0) + 1

	def _ensure_unique_title(self):
		duplicate = frappe.db.exists(
			"Flowlane Sub Process",
			{
				"parent_process": self.parent_process,
				"title": self.title,
				"name": ("!=", self.name),
			},
		)
		if duplicate:
			frappe.throw(
				frappe._("Sub Process {0} already exists for this process.").format(
					frappe.bold(self.title)
				)
			)

	def on_trash(self):
		if frappe.db.exists("Flowlane Process Map", {"sub_process": self.name}):
			frappe.throw(
				frappe._("Remove this sub process's process maps before deleting it.")
			)
