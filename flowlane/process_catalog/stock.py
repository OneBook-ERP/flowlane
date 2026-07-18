# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.3 Stock → Inventory & Warehouse (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Stock Receipt": [
		("S1", "Receive Goods", "Stores/Warehouse", START, [("S2", None)]),
		("S2", "Verify Against PO", "Stores/Warehouse", TASK, [("S3", None)]),
		("S3", "Update Stock Entry", "Stores/Warehouse", IO, [("S4", None)]),
		("S4", "Put Away", "Stores/Warehouse", START, []),
	],
	"Stock Transfer": [
		("S1", "Raise Transfer Request", "Stores/Warehouse", START, [("S2", None)]),
		("S2", "Approve Transfer", "Management/Approver", DECISION, [("S3", "Yes")]),
		("S3", "Pick from Source Warehouse", "Stores/Warehouse", TASK, [("S4", None)]),
		("S4", "Receive at Target Warehouse", "Stores/Warehouse", TASK, [("S5", None)]),
		("S5", "Update Stock Ledger", "Stores/Warehouse", IO, []),
	],
	"Stock Issue": [
		("S1", "Material Request Received", "Stores/Warehouse", START, [("S2", None)]),
		("S2", "Check Availability", "Stores/Warehouse", TASK, [("S3", None)]),
		("S3", "Available?", "Stores/Warehouse", DECISION, [("S4", "Yes"), ("S4", "No")]),
		("S4", "Issue Material to Production", "Stores/Warehouse", TASK, [("S5", None)]),
		("S5", "Update Stock Ledger", "Stores/Warehouse", IO, []),
	],
	"Cycle Count": [
		("S1", "Schedule Cycle Count", "Stores/Warehouse", START, [("S2", None)]),
		("S2", "Physical Count", "Stores/Warehouse", TASK, [("S3", None)]),
		("S3", "Variance Found?", "Quality", DECISION, [("S4", "Yes"), ("S5", "No")]),
		("S4", "Investigate & Adjust", "Quality", TASK, [("S5", None)]),
		("S5", "Close Count", "Stores/Warehouse", START, []),
	],
}
