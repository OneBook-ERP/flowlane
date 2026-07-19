// Flowlane ERPNext Module rows with their `app` field (BACKLOG 1.4) — the
// `erpnext_module` master (masters.js) only carries name/label, not app, so
// this is a separate fetch of the same small doctype via the generic
// frappe.client.get_list (no new backend endpoint needed).
import { createResource } from 'frappe-ui'

export const erpnextModules = createResource({
  url: 'frappe.client.get_list',
  params: {
    doctype: 'Flowlane ERPNext Module',
    fields: ['name', 'app'],
    limit_page_length: 0,
  },
  cache: 'flowlane-erpnext-modules-app',
  auto: true,
})

// The App a module belongs to (e.g. "ERPNext", "HRMS"), safe before fetch.
export function appForModule(moduleName) {
  const row = (erpnextModules.data || []).find((module) => module.name === moduleName)
  return row?.app || ''
}
