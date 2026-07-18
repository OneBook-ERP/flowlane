// Pure Map Step row helpers: build blank/loaded rows, produce the save_steps
// payload (resequenced, connections keyed by target uid), and merge saved names
// back onto client rows. No Vue, no network — unit-tested. See useMapStore.js for
// the reactive store that drives the Table tab from these helpers.

// Scalar fields kept in sync with flowlane.api.map.STEP_FIELDS. `sequence` is
// derived from row order at save time, so it is not user-edited as a cell here.
export const STEP_FIELDS = [
  'step_id',
  'step_name',
  'lane_role',
  'node_type',
  'sequence',
  'trigger_input',
  'output_result',
  'erpnext_module',
  'erpnext_doctype',
  'workflow_state',
  'key_data_fields',
  'business_rules',
  'exceptions',
  'controls_approvals',
  'integrations',
  'kpis',
]

let uidCounter = 0

// Stable client-side row identity. Connections reference a target row by its uid,
// so reordering or renaming step_id never breaks an edge. New rows get a fresh
// uid; loaded rows reuse their server `name` as uid (see fromServerStep).
export function newUid() {
  uidCounter += 1
  return `new-${uidCounter}-${Math.random().toString(36).slice(2, 8)}`
}

export function blankStep(overrides = {}) {
  const step = { uid: newUid(), name: '', connections: [], pain_points: [] }
  STEP_FIELDS.forEach((field) => (step[field] = ''))
  step.node_type = 'Process/Task'
  return Object.assign(step, overrides)
}

// Convert a get_map step (has server `name`, connections keyed by `to_step` name)
// into a client row. Because uid === name for loaded rows, a connection's target
// name is already a valid uid.
export function fromServerStep(row) {
  const step = { uid: row.name, name: row.name, connections: [], pain_points: [] }
  STEP_FIELDS.forEach((field) => (step[field] = row[field] ?? ''))
  step.connections = (row.connections || []).map((conn) => ({
    to_uid: conn.to_step || '',
    label: conn.label || '',
    condition: conn.condition || '',
  }))
  step.pain_points = (row.pain_points || []).map((point) => ({ ...point }))
  return step
}

// Shape the current rows for save_steps: dense 1..n `sequence` from array order,
// and connections limited to targets that still exist (drops edges to deleted
// rows so a delete never leaves a dangling reference).
export function toSavePayload(steps) {
  const liveUids = new Set(steps.map((step) => step.uid))
  return steps.map((step, index) => ({
    uid: step.uid,
    name: step.name || '',
    ...pickScalars(step),
    sequence: index + 1,
    connections: (step.connections || [])
      .filter((conn) => conn.to_uid && liveUids.has(conn.to_uid))
      .map((conn) => ({
        to_uid: conn.to_uid,
        label: conn.label || '',
        condition: conn.condition || '',
      })),
    pain_points: (step.pain_points || []).map((point) => ({ ...point })),
  }))
}

// Promote newly-inserted rows to "saved" by copying their server name in from the
// save_steps uid_map, so the next autosave updates instead of re-inserting.
// Mutates the reactive rows in place; returns them for convenience/testing.
export function mergeUidMap(steps, uidMap) {
  steps.forEach((step) => {
    const name = uidMap[step.uid]
    if (name) step.name = name
  })
  return steps
}

function pickScalars(step) {
  const values = {}
  STEP_FIELDS.forEach((field) => {
    if (field === 'sequence') return
    values[field] = step[field] ?? ''
  })
  return values
}
