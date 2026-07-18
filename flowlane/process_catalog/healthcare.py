# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.12 Healthcare → Patient-to-Billing (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Patient Registration": [
		("S1", "Patient Arrives", "Customer", START, [("S2", None)]),
		("S2", "Register/Verify Patient Details", "Front Desk", TASK, [("S3", None)]),
		("S3", "New or Returning?", "Front Desk", DECISION, [("S4", "New"), ("S5", "Returning")]),
		("S4", "Create Patient Record", "Front Desk", TASK, [("S5", None)]),
		("S5", "Patient Checked In", "Front Desk", START, []),
	],
	"Encounter & Diagnosis": [
		("S1", "Patient Vitals Captured", "Nurse", START, [("S2", None)]),
		("S2", "Doctor Consultation", "Doctor", TASK, [("S3", None)]),
		("S3", "Diagnosis Made", "Doctor", TASK, [("S4", None)]),
		# Yes→(Lab/Radiology) is a different sub process — not representable here.
		("S4", "Tests Required?", "Doctor", DECISION, [("S5", "No")]),
		("S5", "Prescribe & Close Encounter", "Doctor", START, []),
	],
	"Lab/Radiology Orders": [
		("S1", "Order Raised", "Doctor", START, [("S2", None)]),
		("S2", "Sample Collection/Imaging", "Lab", TASK, [("S3", None)]),
		("S3", "Process & Analyze", "Lab", TASK, [("S4", None)]),
		("S4", "Report Ready", "Lab", IO, [("S5", None)]),
		("S5", "Doctor Reviews Report", "Doctor", START, []),
	],
	"Billing & Insurance Claims": [
		("S1", "Encounter Completed", "Front Desk", START, [("S2", None)]),
		("S2", "Generate Bill", "Front Desk", TASK, [("S3", None)]),
		("S3", "Insurance Case?", "Front Desk", DECISION, [("S4", "Yes"), ("S5", "No")]),
		("S4", "File Insurance Claim", "Accounts Receivable", TASK, [("S6", None)]),
		("S5", "Collect Payment", "Front Desk", TASK, [("S6", None)]),
		("S6", "Billing Closed", "Front Desk", START, []),
	],
}
