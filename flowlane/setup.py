# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Idempotent app setup, run from BOTH after_install and after_migrate.

Why hooks and not patches: patches in patches.txt are marked complete WITHOUT
executing on a fresh install, so a fresh install would otherwise never get the
Flowlane roles, permissions, or seed masters. Running an idempotent create-if-
absent setup from after_install (fresh) + after_migrate (upgrades) covers both.
"""

import frappe

CONSULTANT = "Flowlane Consultant"
MANAGER = "Flowlane Manager"

MASTER_DOCTYPES = (
	"Flowlane Node Type",
	"Flowlane Lane Role",
	"Flowlane Value Stream",
	"Flowlane Process Category",
	"Flowlane Industry Vertical",
	"Flowlane ERPNext Module",
	"Flowlane Pain Point Type",
	# Not a dropdown dataset, but read-only reference data the same way: the
	# module-picker in New Client reads it via flowlane.api.templates, and
	# only managers curate the templates themselves.
	"Flowlane Process Template",
)

# Doctypes consultants fully own (create/edit/delete); managers get these too.
WORK_DOCTYPES = (
	"Flowlane Client",
	"Flowlane Process",
	"Flowlane Sub Process",
	"Flowlane Process Map",
	"Flowlane Map Step",
)

_FULL = {
	"read": 1, "write": 1, "create": 1, "delete": 1,
	"report": 1, "export": 1, "print": 1, "email": 1, "share": 1,
}
_READ = {"read": 1, "report": 1, "export": 1, "print": 1}


def ensure_setup(*args, **kwargs) -> None:
	"""Create roles, permissions and seed masters. Safe to run repeatedly."""
	_ensure_roles()
	_ensure_permissions()
	_seed_masters()
	_seed_process_templates()
	frappe.clear_cache()


# --- roles & permissions ---------------------------------------------------

def _ensure_roles() -> None:
	for role in (CONSULTANT, MANAGER):
		if not frappe.db.exists("Role", role):
			frappe.get_doc(
				{"doctype": "Role", "role_name": role, "desk_access": 1}
			).insert(ignore_permissions=True)


def _ensure_permissions() -> None:
	# Managers run everything (work + masters); consultants author the work
	# doctypes and read masters to populate dropdowns.
	for doctype in WORK_DOCTYPES:
		_ensure_perm(doctype, MANAGER, _FULL)
		_ensure_perm(doctype, CONSULTANT, _FULL)
	for doctype in MASTER_DOCTYPES:
		_ensure_perm(doctype, MANAGER, _FULL)
		_ensure_perm(doctype, CONSULTANT, _READ)


def _ensure_perm(doctype: str, role: str, rights: dict) -> None:
	if frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role, "permlevel": 0}):
		return
	frappe.get_doc(
		{
			"doctype": "Custom DocPerm",
			"parent": doctype,
			"parenttype": "DocType",
			"parentfield": "permissions",
			"permlevel": 0,
			"role": role,
			**rights,
		}
	).insert(ignore_permissions=True)


# --- seed masters (create-if-absent) ---------------------------------------

def _seed_masters() -> None:
	_seed("Flowlane Node Type", "node_type_name", NODE_TYPES)
	_seed("Flowlane Lane Role", "role_name", LANE_ROLES)
	_seed("Flowlane Value Stream", "value_stream_name", VALUE_STREAMS)
	_seed("Flowlane Process Category", "category_name", PROCESS_CATEGORIES)
	_seed("Flowlane Industry Vertical", "vertical_name", INDUSTRY_VERTICALS)
	_seed("Flowlane ERPNext Module", "module_name", ERPNEXT_MODULES)
	_seed("Flowlane Pain Point Type", "type_name", PAIN_POINT_TYPES)


def _seed(doctype: str, name_field: str, rows: list) -> None:
	"""Insert each row keyed by its name field, skipping ones already present."""
	for row in rows:
		values = {name_field: row} if isinstance(row, str) else dict(row)
		if frappe.db.exists(doctype, values[name_field]):
			continue
		frappe.get_doc({"doctype": doctype, **values}).insert(ignore_permissions=True)


# --- seed data (§4) --------------------------------------------------------

NODE_TYPES = [
	# Start/End is used as both a start and an end terminator, contextually.
	{"node_type_name": "Start/End", "shape": "Terminator", "is_start": 1, "is_end": 1},
	{"node_type_name": "Process/Task", "shape": "Rectangle"},
	{"node_type_name": "Decision", "shape": "Diamond"},
	{"node_type_name": "Input/Output", "shape": "Parallelogram"},
	{"node_type_name": "Junction", "shape": "Circle"},
]

LANE_ROLES = [
	"Sales Executive", "Sales Manager", "Stores/Warehouse", "Accounts Receivable",
	"Accounts Payable", "Procurement", "Production", "Quality",
	"Management/Approver", "Customer", "Doctor", "Nurse", "Lab", "Front Desk",
	"HR", "Finance", "IT/System",
]

VALUE_STREAMS = [
	"Quote-to-Cash", "Procure-to-Pay", "Plan-to-Produce", "Hire-to-Retire",
	"Order-to-Fulfil", "Record-to-Report", "Patient-to-Billing", "Issue-to-Resolution",
]

PROCESS_CATEGORIES = ["Horizontal (Core)", "Vertical-Specific", "Supporting"]

INDUSTRY_VERTICALS = [
	"Manufacturing", "Trading/Distribution", "Healthcare", "Services",
	"Retail", "Education", "Non-Profit", "Construction",
]

ERPNEXT_MODULES = [
	"Selling", "Buying", "Stock", "Accounts", "Manufacturing", "HR", "Payroll",
	"Projects", "CRM", "Support", "Assets", "Quality", "Healthcare", "Education",
]

PAIN_POINT_TYPES = [
	"Bottleneck", "Duplicate Data Entry", "Missing Control", "Delayed Approval",
	"Unclear Ownership", "Manual/Off-System Work", "Rework/Error-Prone", "Compliance Risk",
]


# --- seed process templates (create-if-absent) ------------------------------
# One starting skeleton per ERPNext module a client onboarding wizard can
# offer (flowlane.api.templates.apply_templates copies these into a client's
# own Process/Sub Process rows). `value_stream` only points at a VALUE_STREAMS
# entry seeded above; left blank where a module's work doesn't map cleanly to
# a single value stream rather than stretching a fit.
_HORIZONTAL = "Horizontal (Core)"

PROCESS_TEMPLATES = [
	{
		"module": "Selling", "process_name": "Quote-to-Cash",
		"value_stream": "Quote-to-Cash", "category": _HORIZONTAL,
		"sub_processes": [
			"Lead Management", "Opportunity & Quotation", "Order Booking",
			"Fulfilment", "Invoicing & Collections",
		],
	},
	{
		"module": "Buying", "process_name": "Procure-to-Pay",
		"value_stream": "Procure-to-Pay", "category": _HORIZONTAL,
		"sub_processes": [
			"Requisition & Supplier Selection", "Purchase Ordering",
			"Goods Receipt", "Invoice Matching", "Payment",
		],
	},
	{
		# Warehouse ops span both inbound (Procure-to-Pay) and outbound
		# (Quote-to-Cash) value streams, so no single seeded stream fits —
		# left blank rather than picking a stretch.
		"module": "Stock", "process_name": "Inventory & Warehouse",
		"value_stream": None, "category": _HORIZONTAL,
		"sub_processes": ["Stock Receipt", "Stock Transfer", "Stock Issue", "Cycle Count"],
	},
	{
		"module": "Accounts", "process_name": "Financial Close",
		"value_stream": "Record-to-Report", "category": _HORIZONTAL,
		"sub_processes": ["Journal Entries", "Reconciliation", "Period Close", "Reporting"],
	},
	{
		"module": "HR", "process_name": "Hire-to-Retire",
		"value_stream": "Hire-to-Retire", "category": _HORIZONTAL,
		"sub_processes": [
			"Recruitment", "Onboarding", "Payroll Processing", "Exit Management",
		],
	},
	{
		"module": "Manufacturing", "process_name": "Plan-to-Produce",
		"value_stream": "Plan-to-Produce", "category": _HORIZONTAL,
		"sub_processes": [
			"Production Planning", "BOM Management", "Work Order Execution", "Quality Check",
		],
	},
	{
		# Project delivery isn't one of the seeded value streams either.
		"module": "Projects", "process_name": "Projects & Timesheets",
		"value_stream": None, "category": _HORIZONTAL,
		"sub_processes": [
			"Project Setup", "Task Assignment", "Timesheet Capture", "Billing",
		],
	},
]


def _seed_process_templates() -> None:
	for index, template in enumerate(PROCESS_TEMPLATES):
		if frappe.db.exists(
			"Flowlane Process Template",
			{"module": template["module"], "process_name": template["process_name"]},
		):
			continue
		_insert_process_template(template, sequence=index + 1)


def _insert_process_template(template: dict, sequence: int) -> None:
	frappe.get_doc(
		{
			"doctype": "Flowlane Process Template",
			"module": template["module"],
			"process_name": template["process_name"],
			"value_stream": template["value_stream"],
			"category": template["category"],
			"sequence": sequence,
			"sub_process_templates": [
				{"title": title, "sequence": i + 1}
				for i, title in enumerate(template["sub_processes"])
			],
		}
	).insert(ignore_permissions=True)
