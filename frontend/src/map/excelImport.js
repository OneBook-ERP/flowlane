// Upsert parsed Excel rows onto the live Map Step array (BUG FIX). Upload
// Excel previously always called store.addRows, which unconditionally
// appends a new blank step per row — re-uploading a file you had just
// downloaded and edited duplicated every step instead of updating it. This
// matches rows back onto existing steps by step_id (trimmed, case-sensitive)
// instead: a match overwrites that row's scalar fields + pain_points in
// place (uid/name/existing connections identity is preserved unless the file
// also carries a Connections column, see below); no match appends a new row
// the same way addRows always did. Pure — no Vue, no network — so the
// upsert/resolve logic is unit-testable without a live store.
import { blankStep } from './steps.js'

// fieldMaps: sheetRowsToFieldMaps() output — scalar STEP_FIELDS plus optional
// `.connections` ([{ to_step_id, label, condition }]) and `.pain_points`.
// Mutates `steps` in place (existing row objects keep their identity, same
// mutation style as the store's own setField/addPainPoint) and returns
// { added, updated } counts for the caller's toast.
export function upsertStepsFromImport(steps, fieldMaps) {
  let added = 0
  let updated = 0
  fieldMaps.forEach((values) => {
    const { connections, pain_points, ...scalars } = values
    const stepId = String(scalars.step_id || '').trim()
    const existing = stepId && steps.find((step) => step.step_id === stepId)
    if (existing) {
      Object.assign(existing, scalars)
      if (pain_points) existing.pain_points = pain_points
      existing._importedConnections = connections
      updated += 1
    } else {
      const step = blankStep(scalars)
      if (pain_points) step.pain_points = pain_points
      step._importedConnections = connections
      steps.push(step)
      added += 1
    }
  })
  resolveImportedConnections(steps)
  return { added, updated }
}

// Second pass, run once every imported row (existing + newly appended) has a
// stable step_id: turns each row's staged { to_step_id } connections into
// real { to_uid } edges by looking the target up in the FINAL step list — so
// a freshly imported row can link to another row imported in the same file,
// not just to steps that already existed. A row with no Connections column
// in the file (`_importedConnections` undefined) is left untouched, keeping
// whatever connections it already had. A target step_id that doesn't match
// anything (typo, deleted step) is dropped, same dangling-edge policy
// toSavePayload already applies at save time.
function resolveImportedConnections(steps) {
  const uidByStepId = new Map(steps.map((step) => [step.step_id, step.uid]))
  steps.forEach((step) => {
    if (step._importedConnections === undefined) return
    step.connections = (step._importedConnections || [])
      .map((conn) => ({
        to_uid: uidByStepId.get(conn.to_step_id) || '',
        label: conn.label || '',
        condition: conn.condition || '',
      }))
      .filter((conn) => conn.to_uid)
    delete step._importedConnections
  })
}
