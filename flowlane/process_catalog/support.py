# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.9 Support → Issue-to-Resolution (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Ticket Logging": [
		("S1", "Customer Raises Issue", "Customer", START, [("S2", None)]),
		("S2", "Log Support Ticket", "Support Agent", IO, [("S3", None)]),
		("S3", "Ticket Created", "Support Agent", START, []),
	],
	"Triage & Assignment": [
		("S1", "Categorize & Prioritize", "Support Agent", START, [("S2", None)]),
		("S2", "Assign to Agent/Team", "Support Agent", TASK, [("S3", None)]),
		("S3", "Assigned", "Support Agent", START, []),
	],
	"Resolution & Escalation": [
		("S1", "Investigate Issue", "Support Agent", START, [("S2", None)]),
		("S2", "Resolvable at First Level?", "Support Agent", DECISION, [("S4", "Yes"), ("S3", "No")]),
		("S3", "Escalate to Specialist/Manager", "Management/Approver", TASK, [("S4", None)]),
		("S4", "Resolve Ticket", "Support Agent", START, []),
	],
	"Customer Feedback & Closure": [
		("S1", "Confirm Resolution with Customer", "Support Agent", START, [("S2", None)]),
		("S2", "Satisfied?", "Customer", DECISION, [("S4", "Yes"), ("S3", "No")]),
		# "(back to Resolution)" points at a different sub process — not local.
		("S3", "Reopen Ticket", "Support Agent", TASK, []),
		("S4", "Close Ticket", "Support Agent", START, []),
	],
}
