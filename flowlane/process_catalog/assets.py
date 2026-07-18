# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""§2.11 Assets → Asset Lifecycle Management (flowlane-design/PROCESS-CATALOG.md)."""

from flowlane.process_catalog._shared import DECISION, IO, START, TASK

STEPS = {
	"Asset Acquisition & Capitalization": [
		("S1", "Asset Purchased/Received", "Procurement", START, [("S2", None)]),
		("S2", "Record Asset in Register", "Procurement", TASK, [("S3", None)]),
		("S3", "Capitalize Asset", "Finance", IO, [("S4", None)]),
		("S4", "Asset Active", "Finance", START, []),
	],
	"Asset Maintenance & Repair": [
		("S1", "Maintenance Due/Issue Reported", "Asset Custodian", START, [("S2", None)]),
		("S2", "Schedule Maintenance", "Asset Custodian", TASK, [("S3", None)]),
		("S3", "Perform Repair/Service", "Asset Custodian", TASK, [("S4", None)]),
		("S4", "Update Asset Record", "Asset Custodian", IO, [("S5", None)]),
		("S5", "Maintenance Complete", "Asset Custodian", START, []),
	],
	"Asset Transfer/Movement": [
		("S1", "Transfer Request Raised", "Asset Custodian", START, [("S2", None)]),
		("S2", "Approve Transfer", "Management/Approver", DECISION, [("S3", "Yes")]),
		("S3", "Update Asset Location", "Asset Custodian", TASK, [("S4", None)]),
		("S4", "Transfer Complete", "Asset Custodian", START, []),
	],
	"Asset Disposal/Retirement": [
		("S1", "Disposal Requested", "Asset Custodian", START, [("S2", None)]),
		("S2", "Approve Disposal", "Management/Approver", DECISION, [("S3", "Yes")]),
		("S3", "Record Disposal & Write-off", "Finance", TASK, [("S4", None)]),
		("S4", "Asset Retired", "Finance", START, []),
	],
}
