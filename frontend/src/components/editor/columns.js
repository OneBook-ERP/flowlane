// Column definitions for the Table tab grid. `type` drives the cell editor:
//   text    -> plain text input
//   master  -> Combobox over a data/masters key (`master`)
//   doctype -> Combobox over the live ERPNext DocType list
//
// Layout metadata (UI-REVAMP B1):
//   min      -> fixed column width in px (the grid is table-fixed, so this is the
//               actual width; the whole grid scrolls horizontally to reveal all 15
//               fields rather than squeezing every cell).
//   sticky   -> pin this column to the left while scrolling right (row identity).
//   ellipsis -> long free-text: single-line ellipsis + hover tooltip, no hard clip.
//   dot      -> render a node-type color dot in the cell (D6).
//   tip      -> show the full value on hover even though the column is wide.
//   group    -> which StepInspector tab this field belongs to (UI-REVAMP D4):
//               General / Input/Output / Logic & Rules / ERPNext Setup. Table
//               ignores this; it renders every field in one wide row.
//
// PASTE_FIELDS is the positional column order used by Excel paste (the first six
// grid columns), documented so the parser and the grid agree — keep those first.

export const GROUPS = ['General', 'Input/Output', 'Logic & Rules', 'ERPNext Setup']

export const COLUMNS = [
  { field: 'step_id', label: 'Step ID', type: 'text', min: 104, sticky: true, group: 'General' },
  { field: 'step_name', label: 'Step Name', type: 'text', min: 220, sticky: true, tip: true, group: 'General' },
  { field: 'lane_role', label: 'Lane Role', type: 'master', master: 'lane_role', min: 168, group: 'General' },
  { field: 'node_type', label: 'Node Type', type: 'master', master: 'node_type', min: 172, dot: true, group: 'General' },
  { field: 'trigger_input', label: 'Trigger / Input', type: 'text', min: 200, ellipsis: true, group: 'Input/Output' },
  { field: 'output_result', label: 'Output / Result', type: 'text', min: 200, ellipsis: true, group: 'Input/Output' },
  { field: 'erpnext_module', label: 'ERPNext Module', type: 'master', master: 'erpnext_module', min: 168, group: 'ERPNext Setup' },
  { field: 'erpnext_doctype', label: 'ERPNext DocType', type: 'doctype', min: 190, group: 'ERPNext Setup' },
  { field: 'workflow_state', label: 'Workflow State', type: 'text', min: 168, group: 'General' },
  { field: 'key_data_fields', label: 'Key Data Fields', type: 'text', min: 200, ellipsis: true, group: 'Input/Output' },
  { field: 'business_rules', label: 'Business Rules', type: 'text', min: 220, ellipsis: true, group: 'Logic & Rules' },
  { field: 'exceptions', label: 'Exceptions', type: 'text', min: 200, ellipsis: true, group: 'Logic & Rules' },
  { field: 'controls_approvals', label: 'Controls / Approvals', type: 'text', min: 200, ellipsis: true, group: 'Logic & Rules' },
  { field: 'integrations', label: 'Integrations', type: 'text', min: 190, ellipsis: true, group: 'ERPNext Setup' },
  { field: 'kpis', label: 'KPIs', type: 'text', min: 180, ellipsis: true, group: 'Logic & Rules' },
]

// Group COLUMNS into the StepInspector's tab order (UI-REVAMP D4). Field order
// within a group follows COLUMNS' own (original, paste-positional) order — do
// not reorder COLUMNS itself for grouping; PASTE_FIELDS depends on its layout.
// Pure so the tab list and its unit test don't depend on Vue. Every field
// belongs to exactly one of GROUPS; result is [{ group, fields }, ...] in
// GROUPS order.
export function columnsByGroup(columns = COLUMNS) {
  return GROUPS.map((group) => ({
    group,
    fields: columns.filter((column) => column.group === group),
  }))
}

// Fixed-width utility lanes (flex-shrink:0 slots, per ui-design density rhythm):
// the leading order/index column and the trailing action columns.
export const INDEX_COL_WIDTH = 56
export const CONNECTIONS_COL_WIDTH = 104
export const PAIN_COL_WIDTH = 88
export const DELETE_COL_WIDTH = 48

// Left offset (px) for each sticky column, measured from the grid's left edge:
// the index lane, then each preceding sticky column. Assumes sticky columns are
// contiguous and leading (Step ID, Step Name), which the grid guarantees. Pure so
// the header and body rows compute identical offsets.
export function stickyLeftOffsets(columns = COLUMNS, indexWidth = INDEX_COL_WIDTH) {
  const offsets = {}
  let left = indexWidth
  for (const column of columns) {
    if (!column.sticky) continue
    offsets[column.field] = left
    left += column.min
  }
  return offsets
}

// Total intrinsic grid width so the table can overflow and scroll horizontally.
// Pain column is always counted (BACKLOG 2.5 lifted the old As-Is-only gate —
// pain points are captured on both map types now, so the Table grid always
// reserves the lane rather than resizing per map type).
export function tableMinWidth(columns = COLUMNS) {
  const fields = columns.reduce((sum, column) => sum + column.min, 0)
  const trailing = CONNECTIONS_COL_WIDTH + PAIN_COL_WIDTH + DELETE_COL_WIDTH
  return INDEX_COL_WIDTH + fields + trailing
}

// Excel/AI paste maps its columns positionally onto these fields: the first
// six COLUMNS entries, plus Connections and Pain Points — child-table data
// that isn't in COLUMNS at all (Table renders those two as their own
// dedicated grid lanes, not a GridCell). `connections`/`pain_points` are
// synthetic field names recognised by map/pasteParser.js's cellsToFields,
// decoded via map/childRowFormat.js (the same format Excel import/export
// uses) rather than kept as plain text.
export const PASTE_FIELDS = [...COLUMNS.slice(0, 6).map((column) => column.field), 'connections', 'pain_points']

// Display label for a PASTE_FIELDS entry — COLUMNS' own label for a real
// scalar field, or this map for the two synthetic child-table fields.
const PASTE_FIELD_LABELS = { connections: 'Connections', pain_points: 'Pain Points' }
export function pasteFieldLabel(field) {
  return COLUMNS.find((column) => column.field === field)?.label || PASTE_FIELD_LABELS[field] || field
}
