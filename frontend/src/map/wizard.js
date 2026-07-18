// Pure helpers for the Wizard tab (Phase 4). No Vue, no store, no network — these
// back the guided flow-growth actions and are unit-tested. The Wizard itself only
// drives the shared Map Step store (useMapStore); these are its small decisions.

// Node type that marks a branch point. Kept as a constant so "Add branch" and the
// diagram agree on what counts as a Decision (matches the seeded Node Type name).
export const DECISION_TYPE = 'Decision'

export function isDecisionType(nodeType) {
  return nodeType === DECISION_TYPE
}

// Default label for the next branch off a Decision, chosen from the labels already
// used by its outgoing connections: first branch -> "Yes", second -> "No", any
// further branch is left blank for the consultant to name.
const DEFAULT_BRANCH_LABELS = ['Yes', 'No']

export function nextBranchLabel(existingLabels = []) {
  const used = new Set(
    existingLabels.map((label) => (label || '').trim().toLowerCase()),
  )
  return DEFAULT_BRANCH_LABELS.find((label) => !used.has(label.toLowerCase())) || ''
}

// Clamp a step index into the valid range for a list of `length` steps. Used when
// the current step is deleted so navigation never points past the ends.
export function clampIndex(index, length) {
  if (length <= 0) return 0
  return Math.max(0, Math.min(index, length - 1))
}
