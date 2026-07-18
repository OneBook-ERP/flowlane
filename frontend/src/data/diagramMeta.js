// Diagram-only lookups the swimlane engine needs beyond the plain dropdowns:
// node-type -> shape, and lane-role -> sort_order. Fetched once and shared with
// the Diagram tab (see flowlane.api.masters.get_diagram_meta).

import { createResource } from 'frappe-ui'

export const diagramMeta = createResource({
  url: 'flowlane.api.masters.get_diagram_meta',
  cache: 'flowlane-diagram-meta',
})

export function nodeShapeMap() {
  return (diagramMeta.data && diagramMeta.data.node_shapes) || {}
}

export function laneOrderMap() {
  return (diagramMeta.data && diagramMeta.data.lane_order) || {}
}
