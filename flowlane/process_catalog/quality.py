# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.10 Quality → Quality Management (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Incoming Inspection": [
		("S1", "Goods Received", "Stores/Warehouse", START, [("S2", None)]),
		("S2", "Sample & Inspect", "Quality", TASK, [("S3", None)]),
		("S3", "Passed?", "Quality", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Reject/Return to Supplier", "Quality", TASK, []),
		("S5", "Accept into Stock", "Stores/Warehouse", START, []),
	],
	"In-Process Quality Check": [
		("S1", "Production Milestone Reached", "Production", START, [("S2", None)]),
		("S2", "Perform In-Process Check", "Quality", TASK, [("S3", None)]),
		("S3", "Within Spec?", "Quality", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Log Non-Conformance", "Quality", TASK, []),
		("S5", "Continue Production", "Production", START, []),
	],
	"Non-Conformance & CAPA": [
		("S1", "Non-Conformance Logged", "Quality", START, [("S2", None)]),
		("S2", "Root Cause Analysis", "Quality", TASK, [("S3", None)]),
		("S3", "Define Corrective Action", "Quality", TASK, [("S4", None)]),
		("S4", "Approve CAPA Plan", "Management/Approver", DECISION, [("S5", "Yes")]),
		("S5", "Implement & Verify", "Quality", TASK, [("S6", None)]),
		("S6", "CAPA Closed", "Quality", START, []),
	],
	"Outgoing/Final Inspection": [
		("S1", "Finished Goods Ready", "Stores/Warehouse", START, [("S2", None)]),
		("S2", "Final Inspection", "Quality", TASK, [("S3", None)]),
		("S3", "Passed?", "Quality", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Rework/Hold", "Quality", TASK, []),
		("S5", "Release for Dispatch", "Stores/Warehouse", START, []),
	],
}
