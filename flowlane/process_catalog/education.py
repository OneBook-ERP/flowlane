# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.13 Education → Admission-to-Alumni (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Admission & Enrollment": [
		("S1", "Application Received", "Front Desk", START, [("S2", None)]),
		("S2", "Review Application", "Front Desk", TASK, [("S3", None)]),
		("S3", "Eligible?", "Front Desk", DECISION, [("S4", "Yes")]),
		("S4", "Offer Admission", "Front Desk", TASK, [("S5", None)]),
		("S5", "Enrollment Confirmed", "Front Desk", START, []),
	],
	"Course/Program Scheduling": [
		("S1", "Term Planning Starts", "Student/Faculty", START, [("S2", None)]),
		("S2", "Assign Faculty to Courses", "Student/Faculty", TASK, [("S3", None)]),
		("S3", "Publish Timetable", "Student/Faculty", IO, [("S4", None)]),
		("S4", "Schedule Published", "Student/Faculty", START, []),
	],
	"Fee Collection": [
		("S1", "Fee Due", "Student/Faculty", START, [("S2", None)]),
		("S2", "Generate Fee Invoice", "Accounts Receivable", TASK, [("S3", None)]),
		("S3", "Payment Received?", "Accounts Receivable", DECISION, [("S5", "Yes"), ("S4", "No")]),
		("S4", "Send Reminder", "Accounts Receivable", TASK, [("S3", None)]),
		("S5", "Confirm Enrollment", "Front Desk", START, []),
	],
	"Student Assessment & Grading": [
		("S1", "Assessment Conducted", "Student/Faculty", START, [("S2", None)]),
		("S2", "Grade Submission", "Student/Faculty", TASK, [("S3", None)]),
		("S3", "Review & Approve Grades", "Management/Approver", DECISION, [("S4", "Yes")]),
		("S4", "Publish Results", "Student/Faculty", IO, [("S5", None)]),
		("S5", "Term Complete", "Student/Faculty", START, []),
	],
}
