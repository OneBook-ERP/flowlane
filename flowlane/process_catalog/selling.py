# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.1 Selling → Quote-to-Cash (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Lead Management": [
		("S1", "Capture Lead", "Sales Executive", START, [("S2", None)]),
		("S2", "Qualify Lead", "Sales Executive", TASK, [("S3", None)]),
		("S3", "Qualified?", "Sales Manager", DECISION, [("S4", "Yes"), ("S5", "No")]),
		("S4", "Convert to Opportunity", "Sales Executive", TASK, [("S6", None)]),
		("S5", "Nurture / Disqualify Lead", "Sales Executive", TASK, [("S6", None)]),
		("S6", "Lead Closed", "Sales Executive", START, []),
	],
	"Opportunity & Quotation": [
		("S1", "Receive Enquiry", "Sales Executive", START, [("S2", None)]),
		("S2", "Prepare Quotation", "Sales Executive", TASK, [("S3", None)]),
		("S3", "Approve Discount?", "Sales Manager", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Revise Quotation", "Sales Executive", TASK, [("S3", None)]),
		("S5", "Send Quotation", "Sales Executive", IO, [("S6", None)]),
		# Yes→(Order Booking) is a different sub process — not representable here.
		("S6", "Customer Confirms?", "Customer", DECISION, [("S7", "No")]),
		("S7", "Close Lost", "Sales Executive", START, []),
	],
	"Order Booking": [
		("S1", "Receive Confirmed Order", "Sales Executive", START, [("S2", None)]),
		("S2", "Check Stock Availability", "Stores/Warehouse", TASK, [("S3", None)]),
		("S3", "Stock Available?", "Stores/Warehouse", DECISION, [("S4", "Yes"), ("S4", "No")]),
		("S4", "Create Sales Order", "Sales Executive", TASK, [("S5", None)]),
		("S5", "Approve Sales Order", "Sales Manager", TASK, [("S6", None)]),
		("S6", "Order Confirmed", "Sales Executive", START, []),
	],
	"Fulfilment": [
		("S1", "Pick & Pack", "Stores/Warehouse", TASK, [("S2", None)]),
		("S2", "Generate Delivery Note", "Stores/Warehouse", IO, [("S3", None)]),
		("S3", "Dispatch Shipment", "Stores/Warehouse", TASK, [("S4", None)]),
		("S4", "Customer Receives Goods", "Customer", START, []),
	],
	"Invoicing & Collections": [
		("S1", "Generate Invoice", "Accounts Receivable", TASK, [("S2", None)]),
		("S2", "Send Invoice to Customer", "Accounts Receivable", IO, [("S3", None)]),
		("S3", "Payment Received?", "Accounts Receivable", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Follow Up on Payment", "Accounts Receivable", TASK, [("S3", None)]),
		("S5", "Record Payment", "Accounts Receivable", TASK, [("S6", None)]),
		("S6", "Close Invoice", "Accounts Receivable", START, []),
	],
}
