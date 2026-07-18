# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.6 Manufacturing → Plan-to-Produce (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Production Planning": [
		("S1", "Receive Demand Forecast/Sales Order", "Production", START, [("S2", None)]),
		("S2", "Create Production Plan", "Production", TASK, [("S3", None)]),
		("S3", "Check Material Availability", "Stores/Warehouse", TASK, [("S4", None)]),
		("S4", "Materials Available?", "Stores/Warehouse", DECISION, [("S5", "Yes"), ("S5", "No")]),
		("S5", "Release Production Plan", "Production", START, []),
	],
	"BOM Management": [
		("S1", "Create/Update BOM", "Production", START, [("S2", None)]),
		("S2", "Review BOM", "Quality", TASK, [("S3", None)]),
		("S3", "Approve BOM", "Management/Approver", DECISION, [("S4", "Yes")]),
		("S4", "BOM Active", "Production", START, []),
	],
	"Work Order Execution": [
		("S1", "Create Work Order", "Production", START, [("S2", None)]),
		("S2", "Issue Materials to Shop Floor", "Production", TASK, [("S3", None)]),
		("S3", "Execute Production Operations", "Production", TASK, [("S4", None)]),
		("S4", "Record Actual Output", "Production", IO, [("S5", None)]),
		("S5", "Work Order Complete", "Production", START, []),
	],
	"Quality Check": [
		("S1", "Sample Finished Goods", "Quality", START, [("S2", None)]),
		("S2", "Perform Quality Test", "Quality", TASK, [("S3", None)]),
		("S3", "Passed?", "Quality", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Rework/Scrap", "Production", TASK, []),
		("S5", "Move to Finished Goods", "Production", START, []),
	],
}
