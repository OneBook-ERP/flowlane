// Chip color mappings — the single source of truth for every status/type/
// severity chip in the app (UI-REVAMP §3). Sibling to diagram/nodeColors.js,
// which owns node-type hue only; this module owns everything else: Map/
// Process workflow status, As-Is/To-Be map type, Client status, and
// pain-point severity. Consumers call the `*Chip` function they need rather
// than hard-coding Tailwind classes or hex, so a chip color only ever lives
// here — never re-declared per component.
//
// Every chip reuses the SAME `bg-surface-<hue>-3 text-ink-<hue>-9` pairing
// (or the neutral `bg-surface-gray-3 text-ink-gray-7` for "not yet
// meaningful" states) — one vocabulary, so new chips extend it instead of
// inventing a second. Pure + unit-tested; rendered through
// components/StatusChip.vue.
//
// 0.1 (badge intensity CR): the ORIGINAL pairing here was `surface-<hue>-2 /
// ink-<hue>-3` — measured contrast ~1.1:1 (WCAG needs 4.5:1 for this size
// text), because this frappe-ui build's amber/green/red ramps front-load
// several near-white pastel steps before any real hue arrives (unlike the
// gray ramp, which spreads lightness evenly) — `ink-<hue>-3` and
// `surface-<hue>-2` sit one step apart on that same near-white run, so text
// and background were nearly indistinguishable, not merely "restrained".
// `-3`/`-9` keeps the background a soft tint (still restrained — a small
// pill, not a solid loud fill) while the text jumps to the ramp's first
// genuinely dark, saturated step: surface-amber-3/ink-amber-9 measures
// 5.9:1, green 6.2:1, red 6.5:1 — comfortably AA. NEUTRAL's gray ramp was
// already fine (6.7:1) but got a one-step darker text too, for the same
// "turn up intensity" ask, without touching its background.
const NEUTRAL = { classes: 'bg-surface-gray-3 text-ink-gray-7' }
const AMBER = { classes: 'bg-surface-amber-3 text-ink-amber-9', hex: '#db7706' }
const GREEN = { classes: 'bg-surface-green-3 text-ink-green-9', hex: '#16794c' }
const RED = { classes: 'bg-surface-red-3 text-ink-red-9', hex: '#e03636' }

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
