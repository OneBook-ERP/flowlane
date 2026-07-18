# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Standard Process Catalog step data, transcribed from
flowlane-design/PROCESS-CATALOG.md §2. One file per ERPNext module (§2.1-13);
``flowlane.setup._seed_step_templates`` walks ``CATALOG`` to populate each
seeded Sub Process Template's default steps.
"""

from flowlane.process_catalog import accounts, buying, hr, manufacturing, projects, selling, stock

# module_name (matches Flowlane Process Template.module) -> {sub process title: steps}
CATALOG = {
	"Selling": selling.STEPS,
	"Buying": buying.STEPS,
	"Stock": stock.STEPS,
	"Accounts": accounts.STEPS,
	"HR": hr.STEPS,
	"Manufacturing": manufacturing.STEPS,
	"Projects": projects.STEPS,
}
