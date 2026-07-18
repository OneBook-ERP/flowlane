// Chip color mappings — the single source of truth for every status/type/
// severity chip in the app (UI-REVAMP §3). Sibling to diagram/nodeColors.js,
// which owns node-type hue only; this module owns everything else: Map/
// Process workflow status, As-Is/To-Be map type, Client status, and
// pain-point severity. Consumers call the `*Chip` function they need rather
// than hard-coding Tailwind classes or hex, so a chip color only ever lives
// here — never re-declared per component.
//
// Every chip reuses the SAME low-saturation `bg-surface-<hue>-2
// text-ink-<hue>-3` pairing frappe-ui ships (or the neutral
// `bg-surface-gray-3 text-ink-gray-6` for "not yet meaningful" states) — the
// exact pairing the pre-existing As-Is/To-Be badge and Client status pill
// already used, so new chips extend one vocabulary instead of inventing a
// second. Pure + unit-tested; rendered through components/StatusChip.vue.

const NEUTRAL = { classes: 'bg-surface-gray-3 text-ink-gray-6' }
const AMBER = { classes: 'bg-surface-amber-2 text-ink-amber-3', hex: '#db7706' }
const GREEN = { classes: 'bg-surface-green-2 text-ink-green-3', hex: '#16794c' }
const RED = { classes: 'bg-surface-red-2 text-ink-red-3', hex: '#e03636' }

// Map / Process workflow status — both DocTypes share this exact vocabulary
// (ProcessDialog.vue / NewMapDialog.vue), so one mapping serves both.
const STATUS_CHIPS = {
  Draft: NEUTRAL,
  'In Review': AMBER,
  Approved: GREEN,
}
export function statusChip(status) {
  return STATUS_CHIPS[status] || NEUTRAL
}

// As-Is / To-Be map type — centralizes what MapBadge.vue used to hard-code
// inline, so it isn't the one chip color left living only in a component.
const MAP_TYPE_CHIPS = {
  'As-Is': AMBER,
  'To-Be': GREEN,
}
export function mapTypeChip(mapType) {
  return MAP_TYPE_CHIPS[mapType] || NEUTRAL
}

// Flowlane Client status (home grid/list) — previously duplicated verbatim
// in ClientTile.vue and ClientListRow.vue; centralized here instead.
const CLIENT_STATUS_CHIPS = {
  Active: GREEN,
  Prospect: AMBER,
  Archived: NEUTRAL,
}
export function clientStatusChip(status) {
  return CLIENT_STATUS_CHIPS[status] || NEUTRAL
}

// Pain point severity (§3: "amber = medium, red = high"). `hex` backs the
// Diagram tab's SVG pain-point badge, which can't apply Tailwind classes
// inside an <svg> — it uses the same ink tone the HTML chip renders in, so
// the SVG badge and the HTML chip always agree.
const SEVERITY_CHIPS = {
  Low: { ...NEUTRAL, hex: '#525252' },
  Medium: AMBER,
  High: RED,
}
export function severityChip(severity) {
  return SEVERITY_CHIPS[severity] || SEVERITY_CHIPS.Low
}

// Severity ordering (Low < Medium < High) — the one ranking every
// severity-sorting consumer (the diagram's per-node badge color, the Risks
// strip's worst-first order) shares, so "which severity wins" is never
// redefined twice.
const SEVERITY_RANK = { Low: 0, Medium: 1, High: 2 }
export function severityRank(severity) {
  return SEVERITY_RANK[severity] ?? SEVERITY_RANK.Low
}

// Highest-severity-wins pick, used for a node badge that carries several
// pain points of different severities.
export function maxSeverity(severities) {
  return severities.reduce(
    (max, s) => (severityRank(s) > severityRank(max) ? s : max),
    'Low'
  )
}
