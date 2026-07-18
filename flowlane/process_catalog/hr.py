# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.5 HR → Hire-to-Retire (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Recruitment": [
		("S1", "Raise Job Requisition", "HR", START, [("S2", None)]),
		("S2", "Approve Requisition", "Management/Approver", DECISION, [("S3", "Yes")]),
		("S3", "Post Job Opening", "HR", TASK, [("S4", None)]),
		("S4", "Screen & Interview Candidates", "HR", TASK, [("S5", None)]),
		("S5", "Selected?", "HR", DECISION, [("S6", "Yes"), ("S4", "No")]),
		("S6", "Extend Offer", "HR", TASK, [("S7", None)]),
		("S7", "Offer Accepted", "HR", START, []),
	],
	"Onboarding": [
		("S1", "New Hire Confirmed", "HR", START, [("S2", None)]),
		("S2", "Create Employee Record", "HR", TASK, [("S3", None)]),
		("S3", "Provision IT Access & Assets", "IT/System", TASK, [("S4", None)]),
		("S4", "Complete Induction", "HR", TASK, [("S5", None)]),
		("S5", "Onboarding Complete", "HR", START, []),
	],
	"Payroll Processing": [
		("S1", "Collect Attendance & Timesheets", "HR", START, [("S2", None)]),
		("S2", "Calculate Salary & Deductions", "HR", TASK, [("S3", None)]),
		("S3", "Review Payroll", "Finance", TASK, [("S4", None)]),
		("S4", "Approve Payroll Run", "Management/Approver", DECISION, [("S5", "Yes")]),
		("S5", "Disburse Salaries", "Finance", TASK, [("S6", None)]),
		("S6", "Generate Payslips", "HR", IO, []),
	],
	"Exit Management": [
		("S1", "Resignation/Termination Initiated", "HR", START, [("S2", None)]),
		("S2", "Conduct Exit Interview", "HR", TASK, [("S3", None)]),
		("S3", "Revoke IT Access", "IT/System", TASK, [("S4", None)]),
		("S4", "Process Full & Final Settlement", "Finance", TASK, [("S5", None)]),
		("S5", "Exit Complete", "HR", START, []),
	],
}
