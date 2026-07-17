// Pure sub-process ordering helpers (no Vue, no network) so the reorder logic is
// unit-testable. The tree stores order in an integer `sequence`; the UI moves a
// row up/down and we recompute a dense 1..n sequence for the affected list.

// Move the item at `fromIndex` to `toIndex`, returning a new array (inputs kept
// immutable). Out-of-range indexes are clamped; a no-op move returns a copy.
export function moveItem(items, fromIndex, toIndex) {
  const result = items.slice()
  const from = clamp(fromIndex, 0, result.length - 1)
  const to = clamp(toIndex, 0, result.length - 1)
  const [moved] = result.splice(from, 1)
  result.splice(to, 0, moved)
  return result
}

// Given the desired order, return only the rows whose `sequence` must change,
// as `[{ name, sequence }]` (1-based, dense). Callers persist just these — no
// write for rows already at their target sequence.
export function resequence(orderedItems) {
  const changes = []
  orderedItems.forEach((item, index) => {
    const sequence = index + 1
    if (item.sequence !== sequence) changes.push({ name: item.name, sequence })
  })
  return changes
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
