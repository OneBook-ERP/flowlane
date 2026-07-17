# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from flowlane.api.map import validate_graph


class FlowlaneProcessMap(Document):
	def validate(self):
		self._set_default_title()
		self._ensure_unique_version()
		# Graph checks only surface warnings (missing/extra start nodes,
		# unreachable steps); they never block a save.
		validate_graph(self.name)

	def _set_default_title(self):
		if not self.map_title:
			sub_process_title = frappe.db.get_value(
				"Flowlane Sub Process", self.sub_process, "title"
			)
			self.map_title = f"{sub_process_title} — {self.map_type}"

	def _ensure_unique_version(self):
		duplicate = frappe.db.exists(
			"Flowlane Process Map",
			{
				"sub_process": self.sub_process,
				"map_type": self.map_type,
				"version_label": self.version_label,
				"name": ("!=", self.name),
			},
		)
		if duplicate:
			frappe.throw(
				frappe._(
					"A {0} map with version {1} already exists for this sub process."
				).format(self.map_type, frappe.bold(self.version_label))
			)

	def on_trash(self):
		# Cascade-delete the map's steps; each step's on_trash clears the child
		# connection/pain-point rows and any inbound edges.
		for step in frappe.get_all(
			"Flowlane Map Step", filters={"process_map": self.name}, pluck="name"
		):
			frappe.delete_doc(
				"Flowlane Map Step", step, force=True, ignore_permissions=True
			)
