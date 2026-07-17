# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import validate_email_address


class FlowlaneClient(Document):
	def validate(self):
		if self.primary_contact_email:
			validate_email_address(self.primary_contact_email, throw=True)

	def on_trash(self):
		# A client is a folder; refuse to delete while processes still hang off it.
		if frappe.db.exists("Flowlane Process", {"client": self.name}):
			frappe.throw(
				frappe._("Archive the client instead or remove its processes first.")
			)
