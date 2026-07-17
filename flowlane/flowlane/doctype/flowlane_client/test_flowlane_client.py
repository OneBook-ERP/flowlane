# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt

# Skip auto-generating a Customer test record: it pulls the whole ERPNext
# Company/Fiscal Year chain, which clashes with real data on this site. The
# `customer` link is optional and unused by Flowlane's own tests.
IGNORE_TEST_RECORD_DEPENDENCIES = ["Customer"]
