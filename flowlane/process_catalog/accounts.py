# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.4 Accounts → Financial Close (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Journal Entries": [
		("S1", "Identify Adjusting Entries", "Finance", START, [("S2", None)]),
		("S2", "Post Journal Entry", "Finance", TASK, [("S3", None)]),
		("S3", "Review & Approve", "Management/Approver", TASK, [("S4", None)]),
		("S4", "Entry Posted", "Finance", START, []),
	],
	"Reconciliation": [
		("S1", "Pull Bank Statement", "Finance", START, [("S2", None)]),
		("S2", "Match Transactions", "Finance", TASK, [("S3", None)]),
		("S3", "Discrepancy Found?", "Finance", DECISION, [("S4", "Yes"), ("S5", "No")]),
		("S4", "Investigate Discrepancy", "Finance", TASK, [("S5", None)]),
		("S5", "Mark Reconciled", "Finance", START, []),
	],
	"Period Close": [
		("S1", "Close Sub-Ledgers", "Finance", TASK, [("S2", None)]),
		("S2", "Run Depreciation", "Finance", TASK, [("S3", None)]),
		("S3", "Review Trial Balance", "Management/Approver", TASK, [("S4", None)]),
		("S4", "Balanced?", "Management/Approver", DECISION, [("S6", "Yes"), ("S5", "No")]),
		("S5", "Correct Entries", "Finance", TASK, [("S3", None)]),
		("S6", "Lock Period", "Finance", START, []),
	],
	"Reporting": [
		("S1", "Generate Financial Statements", "Finance", TASK, [("S2", None)]),
		("S2", "Review Statements", "Management/Approver", TASK, [("S3", None)]),
		("S3", "Publish/Distribute Reports", "Finance", IO, [("S4", None)]),
		("S4", "Reporting Complete", "Finance", START, []),
	],
}
