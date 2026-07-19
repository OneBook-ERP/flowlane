# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Idempotent app setup, run from BOTH after_install and after_migrate.

Why hooks and not patches: patches in patches.txt are marked complete WITHOUT
executing on a fresh install, so a fresh install would otherwise never get the
Flowlane roles, permissions, or seed masters. Running an idempotent create-if-
absent setup from after_install (fresh) + after_migrate (upgrades) covers both.
"""

import frappe

from flowlane.process_catalog import CATALOG

CONSULTANT = "Flowlane Consultant"
MANAGER = "Flowlane Manager"
SYSTEM_MANAGER = "System Manager"

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
	"Flowlane Map Step Template",
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
	_ensure_workspace()
	_seed_masters()
	_seed_process_templates()
	_seed_step_templates()
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


# --- Desk workspace ---------------------------------------------------------
# Built programmatically (not a workspace fixture JSON) so it reuses this same
# idempotent create-if-absent seeding pathway as everything else in this file,
# rather than introducing a second seeding mechanism for one doctype record.

WORKSPACE_DESCRIPTION = (
	"Flowlane is an internal consulting tool for mapping a client's business "
	"processes end-to-end &mdash; value streams, sub-processes and ERPNext-aligned "
	"swimlanes &mdash; captured via a guided wizard or an Excel-like table, with a "
	"live diagram generated from the same data. This Desk workspace is for "
	"System Managers and Flowlane Managers to browse clients, masters and the "
	"process catalog; consultants do the actual mapping in the Flowlane app itself."
)

# (card label, doctypes listed under it, in order)
WORKSPACE_CARDS = (
	(
		"Process Hierarchy",
		(
			"Flowlane Client",
			"Flowlane Process",
			"Flowlane Sub Process",
			"Flowlane Process Map",
			"Flowlane Map Step",
		),
	),
	(
		"Master Data",
		(
			"Flowlane Node Type",
			"Flowlane Lane Role",
			"Flowlane Value Stream",
			"Flowlane Process Category",
			"Flowlane Industry Vertical",
			"Flowlane ERPNext Module",
			"Flowlane Pain Point Type",
		),
	),
	(
		"Process Catalog",
		(
			"Flowlane Process Template",
			"Flowlane Map Step Template",
		),
	),
)

# (label, doctype) for the top shortcut row; the 4th shortcut (URL to the SPA)
# is appended separately since it isn't a DocType shortcut.
WORKSPACE_SHORTCUT_DOCTYPES = (
	("Flowlane Client", "Flowlane Client"),
	("Flowlane Process Map", "Flowlane Process Map"),
	("Flowlane Map Step", "Flowlane Map Step"),
)


def _ensure_workspace() -> None:
	if frappe.db.exists("Workspace", "Flowlane"):
		return
	frappe.get_doc(
		{
			"doctype": "Workspace",
			"label": "Flowlane",
			"title": "Flowlane",
			"module": "Flowlane",
			"app": "flowlane",
			"icon": "workflow",
			"public": 1,
			"is_hidden": 0,
			"sequence_id": 1.0,
			"content": frappe.as_json(_workspace_content_blocks()),
			"shortcuts": _workspace_shortcuts(),
			"links": _workspace_links(),
			"roles": [{"role": role} for role in (SYSTEM_MANAGER, MANAGER, CONSULTANT)],
		}
	).insert(ignore_permissions=True)


def _workspace_content_blocks() -> list:
	blocks = [
		_block("header", {"text": '<span class="h4"><b>Flowlane</b></span>', "col": 12}),
		_block("paragraph", {"text": WORKSPACE_DESCRIPTION, "col": 12}),
		_block("header", {"text": '<span class="h4"><b>Your Shortcuts</b></span>', "col": 12}),
	]
	for label, _doctype in WORKSPACE_SHORTCUT_DOCTYPES:
		blocks.append(_block("shortcut", {"shortcut_name": label, "col": 3}))
	blocks.append(_block("shortcut", {"shortcut_name": "Open Flowlane App", "col": 3}))
	blocks.append(_block("spacer", {"col": 12}))
	blocks.append(_block("header", {"text": '<span class="h4"><b>Reports &amp; Masters</b></span>', "col": 12}))
	for card_name, _doctypes in WORKSPACE_CARDS:
		blocks.append(_block("card", {"card_name": card_name, "col": 4}))
	return blocks


def _block(block_type: str, data: dict) -> dict:
	return {"id": frappe.generate_hash(length=10), "type": block_type, "data": data}


def _workspace_shortcuts() -> list:
	shortcuts = [
		{"type": "DocType", "label": label, "link_to": doctype}
		for label, doctype in WORKSPACE_SHORTCUT_DOCTYPES
	]
	shortcuts.append({"type": "URL", "label": "Open Flowlane App", "url": "/flowlane"})
	return shortcuts


def _workspace_links() -> list:
	links = []
	for card_name, doctypes in WORKSPACE_CARDS:
		links.append({"type": "Card Break", "label": card_name, "link_count": len(doctypes)})
		links.extend(
			{"type": "Link", "link_type": "DocType", "label": doctype, "link_to": doctype}
			for doctype in doctypes
		)
	return links


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
	# Added for the Standard Process Catalog (PROCESS-CATALOG.md §0): Projects,
	# Support, Assets and Education needed lane roles nothing existing covered.
	"Project Manager", "Team Member", "Support Agent", "Asset Custodian", "Student/Faculty",
]

VALUE_STREAMS = [
	"Quote-to-Cash", "Procure-to-Pay", "Plan-to-Produce", "Hire-to-Retire",
	"Order-to-Fulfil", "Record-to-Report", "Patient-to-Billing", "Issue-to-Resolution",
	# Added for the Standard Process Catalog (PROCESS-CATALOG.md §0): Education
	# had no existing stream that fit.
	"Admission-to-Alumni",
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
_SUPPORTING = "Supporting"
_VERTICAL = "Vertical-Specific"

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
	# --- new processes (PROCESS-CATALOG.md §2.8-13) -------------------------
	{
		# Overlaps heavily with Selling's own pipeline value stream — left
		# blank per the approved recommendation rather than adding a
		# redundant "Lead-to-Loyalty" stream.
		"module": "CRM", "process_name": "Customer Engagement & Retention",
		"value_stream": None, "category": _HORIZONTAL,
		"sub_processes": [
			"Campaign Management", "Contact & Account Management",
			"Customer Communication", "Renewal & Retention",
		],
	},
	{
		"module": "Support", "process_name": "Issue-to-Resolution",
		"value_stream": "Issue-to-Resolution", "category": _HORIZONTAL,
		"sub_processes": [
			"Ticket Logging", "Triage & Assignment",
			"Resolution & Escalation", "Customer Feedback & Closure",
		],
	},
	{
		# Cross-cutting like Stock — spans Buying, Manufacturing and Selling
		# rather than belonging to one value stream.
		"module": "Quality", "process_name": "Quality Management",
		"value_stream": None, "category": _SUPPORTING,
		"sub_processes": [
			"Incoming Inspection", "In-Process Quality Check",
			"Non-Conformance & CAPA", "Outgoing/Final Inspection",
		],
	},
	{
		"module": "Assets", "process_name": "Asset Lifecycle Management",
		"value_stream": None, "category": _SUPPORTING,
		"sub_processes": [
			"Asset Acquisition & Capitalization", "Asset Maintenance & Repair",
			"Asset Transfer/Movement", "Asset Disposal/Retirement",
		],
	},
	{
		"module": "Healthcare", "process_name": "Patient-to-Billing",
		"value_stream": "Patient-to-Billing", "category": _VERTICAL,
		"sub_processes": [
			"Patient Registration", "Encounter & Diagnosis",
			"Lab/Radiology Orders", "Billing & Insurance Claims",
		],
	},
	{
		"module": "Education", "process_name": "Admission-to-Alumni",
		"value_stream": "Admission-to-Alumni", "category": _VERTICAL,
		"sub_processes": [
			"Admission & Enrollment", "Course/Program Scheduling",
			"Fee Collection", "Student Assessment & Grading",
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


# --- seed step templates (create-if-absent) ---------------------------------
# Populates each Sub Process Template's default steps from the Standard
# Process Catalog (flowlane.process_catalog.CATALOG). Kept separate from
# _seed_process_templates because that function skips a whole process the
# moment it exists -- steps need their own idempotency check so re-running
# setup after this catalog is extended still backfills steps onto
# already-seeded (older) sub process templates.

def _seed_step_templates() -> None:
	for module, sub_processes in CATALOG.items():
		process_template = frappe.db.get_value("Flowlane Process Template", {"module": module}, "name")
		if not process_template:
			continue
		for title, steps in sub_processes.items():
			_seed_steps_for_sub_process(process_template, title, steps)


def _seed_steps_for_sub_process(process_template: str, title: str, steps: list) -> None:
	sub_process_template = frappe.db.get_value(
		"Flowlane Sub Process Template",
		{"parenttype": "Flowlane Process Template", "parent": process_template, "title": title},
		"name",
	)
	if not sub_process_template:
		frappe.throw(
			frappe._("Sub Process Template {0} not found under {1}.").format(title, process_template)
		)
	if frappe.db.exists("Flowlane Map Step Template", {"sub_process_template": sub_process_template}):
		return
	for sequence, (step_key, step_name, lane_role, node_type, connections) in enumerate(steps, start=1):
		frappe.get_doc(
			{
				"doctype": "Flowlane Map Step Template",
				"sub_process_template": sub_process_template,
				"step_key": step_key,
				"step_name": step_name,
				"lane_role": lane_role,
				"node_type": node_type,
				"sequence": sequence,
				"connections": [
					{"to_step_key": to_key, "label": label} for to_key, label in connections
				],
			}
		).insert(ignore_permissions=True)
