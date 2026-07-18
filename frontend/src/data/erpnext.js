// Live ERPNext DocType list for the Map Step `erpnext_doctype` picker. Fetched
// once (cached) and filtered client-side by the Combobox. Backing API:
// flowlane.api.erpnext.get_doctypes. Options are [{label, value}].

import { createResource } from 'frappe-ui'

export const doctypes = createResource({
  url: 'flowlane.api.erpnext.get_doctypes',
  cache: 'flowlane-doctypes',
})

export function doctypeOptions() {
  return doctypes.data || []
}
