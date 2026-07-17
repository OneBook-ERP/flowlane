# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FlowlaneMapStep(Document):
	def validate(self):
		self._ensure_unique_step_id()
		self._ensure_connections_stay_in_map()

	def _ensure_unique_step_id(self):
		duplicate = frappe.db.exists(
			"Flowlane Map Step",
			{
				"process_map": self.process_map,
				"step_id": self.step_id,
				"name": ("!=", self.name),
			},
		)
		if duplicate:
			frappe.throw(
				frappe._("Step ID {0} is already used in this map.").format(
					frappe.bold(self.step_id)
				)
			)

	def _ensure_connections_stay_in_map(self):
		# An edge may only point at another step in the same map — no cross-map
		# connections, which would produce an unrenderable dangling edge.
		for connection in self.connections:
			if not connection.to_step:
				continue
			target_map = frappe.db.get_value(
				"Flowlane Map Step", connection.to_step, "process_map"
			)
			if target_map != self.process_map:
				frappe.throw(
					frappe._(
						"Connection target {0} belongs to a different map."
					).format(frappe.bold(connection.to_step))
				)

	def on_trash(self):
		# Clear inbound edges so no connection is left pointing at a deleted step.
		frappe.db.set_value(
			"Flowlane Step Connection",
			{"to_step": self.name},
			"to_step",
			None,
			update_modified=False,
		)
