# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.8 CRM → Customer Engagement & Retention (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Campaign Management": [
		("S1", "Define Campaign Objective", "Sales Executive", START, [("S2", None)]),
		("S2", "Build Target Segment", "Sales Executive", TASK, [("S3", None)]),
		("S3", "Approve Campaign Budget", "Management/Approver", DECISION, [("S4", "Yes")]),
		("S4", "Launch Campaign", "Sales Executive", TASK, [("S5", None)]),
		("S5", "Track Campaign Response", "Sales Executive", IO, []),
	],
	"Contact & Account Management": [
		("S1", "Create/Update Contact Record", "Sales Executive", START, [("S2", None)]),
		("S2", "Log Interaction", "Sales Executive", TASK, [("S3", None)]),
		("S3", "Update Account Health Score", "Sales Executive", IO, [("S4", None)]),
		("S4", "Record Complete", "Sales Executive", START, []),
	],
	"Customer Communication": [
		("S1", "Trigger Communication", "Sales Executive", START, [("S2", None)]),
		("S2", "Send Communication", "Sales Executive", TASK, [("S3", None)]),
		("S3", "Track Engagement", "Sales Executive", IO, []),
	],
	"Renewal & Retention": [
		("S1", "Identify Upcoming Renewal", "Sales Executive", START, [("S2", None)]),
		("S2", "Reach Out to Customer", "Sales Executive", TASK, [("S3", None)]),
		("S3", "Renewal Confirmed?", "Customer", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Win-Back Offer", "Sales Executive", TASK, [("S3", None)]),
		("S5", "Process Renewal", "Sales Executive", START, []),
	],
}
