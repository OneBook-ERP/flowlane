# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.2 Buying → Procure-to-Pay (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Requisition & Supplier Selection": [
		("S1", "Raise Material Request", "Procurement", START, [("S2", None)]),
		("S2", "Approve Requisition", "Management/Approver", DECISION, [("S4", "Yes"), ("S3", "No")]),
		("S3", "Revise Requisition", "Procurement", TASK, [("S2", None)]),
		("S4", "Select Supplier", "Procurement", TASK, [("S5", None)]),
		("S5", "Send RFQ", "Procurement", IO, []),
	],
	"Purchase Ordering": [
		("S1", "Compare Supplier Quotes", "Procurement", TASK, [("S2", None)]),
		("S2", "Select Best Quote", "Procurement", DECISION, [("S3", None)]),
		("S3", "Create Purchase Order", "Procurement", TASK, [("S4", None)]),
		("S4", "Approve Purchase Order", "Management/Approver", TASK, [("S5", None)]),
		("S5", "Send PO to Supplier", "Procurement", START, []),
	],
	"Goods Receipt": [
		("S1", "Receive Shipment", "Stores/Warehouse", START, [("S2", None)]),
		("S2", "Inspect Goods", "Quality", TASK, [("S3", None)]),
		("S3", "Quality Passed?", "Quality", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Return to Supplier", "Stores/Warehouse", TASK, []),
		("S5", "Accept into Stock", "Stores/Warehouse", TASK, [("S6", None)]),
		("S6", "Update Stock Ledger", "Stores/Warehouse", IO, []),
	],
	"Invoice Matching": [
		("S1", "Receive Supplier Invoice", "Accounts Payable", START, [("S2", None)]),
		("S2", "Three-Way Match (PO/GRN/Invoice)", "Accounts Payable", TASK, [("S3", None)]),
		("S3", "Match Successful?", "Accounts Payable", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Query Discrepancy", "Accounts Payable", TASK, [("S2", None)]),
		("S5", "Approve for Payment", "Accounts Payable", TASK, []),
	],
	"Payment": [
		("S1", "Schedule Payment", "Accounts Payable", TASK, [("S2", None)]),
		("S2", "Approve Payment Run", "Finance", TASK, [("S3", None)]),
		("S3", "Process Payment", "Finance", TASK, [("S4", None)]),
		("S4", "Close Purchase", "Accounts Payable", START, []),
	],
}
