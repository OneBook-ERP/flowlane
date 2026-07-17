// Master dropdown datasets, fetched once and shared across every dialog.
// Shape: { value_stream: [{label,value}], category: [...], ... } — see
// flowlane.api.masters.get_masters. Call `masters.fetch()` once (App mount);
// read `masters.data[key]` reactively wherever a dropdown needs options.

import { createResource } from 'frappe-ui'

export const masters = createResource({
  url: 'flowlane.api.masters.get_masters',
  cache: 'flowlane-masters',
})

// Options for one master key, safe before the fetch resolves (returns []).
export function masterOptions(key) {
  return (masters.data && masters.data[key]) || []
}
