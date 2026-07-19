// Rotating soft-tint palette for lane BANDS (BACKLOG 4.1) — a different color
// axis than node-type (nodeColors.js owns that one). Lanes currently render as
// two alternating grays; with many lanes that reads flat and is hard to scan.
// A small fixed set of pastel hues, cycled by lane index, makes each lane
// visually distinct at a glance without turning the canvas into a rainbow —
// restrained per ui-design ("color sparingly... small components"), so the
// set stays short (6 hues) and every tint sits in the same pale-background
// register as the gray bands it replaces, rather than introducing a louder
// saturated block. Pure + unit-tested; DiagramTab.vue is the only consumer.
const LANE_TINTS = [
  { fill: '#eef4ff', label: '#dbe6fd', stroke: '#c7d7fb' }, // blue
  { fill: '#f5f0ff', label: '#e7dcfd', stroke: '#d9c9fb' }, // violet
  { fill: '#eefaf3', label: '#d9f2e3', stroke: '#c3e9d2' }, // green
  { fill: '#fff8ec', label: '#fcecc9', stroke: '#f8dfa1' }, // amber
  { fill: '#fff0f3', label: '#fcdde3', stroke: '#f8c3cd' }, // rose
  { fill: '#eefbfb', label: '#d7f2f2', stroke: '#bfe8e8' }, // teal
]

// Lane N's tint, cycling back to the first hue once every lane has one — a
// map with more lanes than hues repeats the sequence rather than growing it
// (restraint over exhaustiveness).
export function laneTint(index) {
  return LANE_TINTS[((index % LANE_TINTS.length) + LANE_TINTS.length) % LANE_TINTS.length]
}

export const LANE_TINT_COUNT = LANE_TINTS.length
