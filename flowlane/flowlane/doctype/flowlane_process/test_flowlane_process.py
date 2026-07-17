# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

# Skip auto-generating User test records: User drags in a large frappe/ERPNext
# dependency graph (Email Account -> Company -> Fiscal Year) that clashes with
# real data on this site. The `process_analyst` / `erpnext_architect` links are
# optional and unused by Flowlane's own tests.
IGNORE_TEST_RECORD_DEPENDENCIES = ["User"]
