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
