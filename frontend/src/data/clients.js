// Client data layer: the home-grid list plus create/rename/delete helpers.
// The grid reads the enriched `flowlane.api.tree.get_clients` (adds process
// counts); mutations go through frappe.client so guard messages from server
// conditions (e.g. "Archive the client instead …") surface verbatim.

import { createResource, call } from 'frappe-ui'

export const clients = createResource({
  url: 'flowlane.api.tree.get_clients',
  auto: true,
})

export function createClient(values) {
  return call('frappe.client.insert', {
    doc: { doctype: 'Flowlane Client', ...values },
  })
}

export function renameClient(name, newName) {
  return call('frappe.client.rename_doc', {
    doctype: 'Flowlane Client',
    old_name: name,
    new_name: newName,
  })
}

export function deleteClient(name) {
  return call('frappe.client.delete', { doctype: 'Flowlane Client', name })
}
