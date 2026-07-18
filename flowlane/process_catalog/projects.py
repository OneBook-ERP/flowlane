# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.7 Projects → Projects & Timesheets (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Project Setup": [
		("S1", "Project Approved/Won", "Management/Approver", START, [("S2", None)]),
		("S2", "Define Project Scope & Budget", "Project Manager", TASK, [("S3", None)]),
		("S3", "Create Project in System", "Project Manager", TASK, [("S4", None)]),
		("S4", "Project Kickoff", "Project Manager", START, []),
	],
	"Task Assignment": [
		("S1", "Break Down Work into Tasks", "Project Manager", START, [("S2", None)]),
		("S2", "Assign Tasks to Team", "Project Manager", TASK, [("S3", None)]),
		("S3", "Team Accepts Tasks", "Team Member", START, []),
	],
	"Timesheet Capture": [
		("S1", "Log Time Against Task", "Team Member", START, [("S2", None)]),
		("S2", "Submit Timesheet", "Team Member", TASK, [("S3", None)]),
		("S3", "Approve Timesheet", "Project Manager", DECISION, [("S4", "Yes")]),
		("S4", "Timesheet Approved", "Project Manager", START, []),
	],
	"Billing": [
		("S1", "Billable Hours/Milestone Reached", "Project Manager", START, [("S2", None)]),
		("S2", "Generate Project Invoice", "Accounts Receivable", TASK, [("S3", None)]),
		("S3", "Send Invoice to Client", "Accounts Receivable", IO, [("S4", None)]),
		("S4", "Invoice Sent", "Accounts Receivable", START, []),
	],
}
