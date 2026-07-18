// Workspace-tree data layer for one client: the nested L1->L2->L3 resource plus
// create / rename / delete / reorder helpers for processes, sub processes and
// maps. Hash-named records (Process, Sub Process, Map) have no field-based name,
// so "rename" is a set_value on the title field; the Client is renamed elsewhere.
// All mutations route through frappe.client so server-condition guard messages
// (blocked deletes, uniqueness) reach the UI unchanged.

import { createResource, call } from 'frappe-ui'

// Per-client tree. Create with `loadClientTree(client)` in the workspace page so
// each client gets its own resource instance; call `.reload()` after a mutation.
export function loadClientTree(client) {
  return createResource({
    url: 'flowlane.api.tree.get_client_tree',
    params: { client },
    auto: true,
  })
}

// Resolve a map name to its client (+ process/sub-process) for the `/m/:map`
// deep-link resolver (UI step U2) — the workspace shell lives at `/c/:client`,
// so a bare map link needs one lookup before it can render tree + breadcrumb.
export function getMapLocation(map) {
  return call('flowlane.api.tree.get_map_location', { map })
}

// --- Process (L1) ---------------------------------------------------------

export function createProcess(values) {
  return call('frappe.client.insert', {
    doc: { doctype: 'Flowlane Process', ...values },
  })
}

export function updateProcess(name, values) {
  return call('frappe.client.set_value', {
    doctype: 'Flowlane Process',
    name,
    fieldname: values,
  })
}

export function deleteProcess(name) {
  return call('frappe.client.delete', { doctype: 'Flowlane Process', name })
}

// --- Sub Process (L2) -----------------------------------------------------

export function createSubProcess(values) {
  return call('frappe.client.insert', {
    doc: { doctype: 'Flowlane Sub Process', ...values },
  })
}

export function updateSubProcess(name, values) {
  return call('frappe.client.set_value', {
    doctype: 'Flowlane Sub Process',
    name,
    fieldname: values,
  })
}

export function deleteSubProcess(name) {
  return call('frappe.client.delete', { doctype: 'Flowlane Sub Process', name })
}

// --- Process Map (L3) -----------------------------------------------------

export function createMap(values) {
  return call('frappe.client.insert', {
    doc: { doctype: 'Flowlane Process Map', ...values },
  })
}

export function updateMap(name, values) {
  return call('frappe.client.set_value', {
    doctype: 'Flowlane Process Map',
    name,
    fieldname: values,
  })
}

export function deleteMap(name) {
  return call('frappe.client.delete', { doctype: 'Flowlane Process Map', name })
}
