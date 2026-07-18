// Pure helper for the Diagram tab's per-node detail indicators (UI step U6
// addition). Map Steps carry 11 non-core fields (Trigger/Input, Workflow
// State, Business Rules, …) that only ever show in the shared StepInspector
// (Table/Wizard/click-a-node) — none render on the canvas itself, by design
// (canvas = identity + flow, inspector = detail). This adds a SMALL,
// restrained exception: a couple of high-signal fields get a tiny icon on
// the node so a step with hidden detail reads as "there's more here" at a
// glance, without turning the canvas into a second field-by-field view.
//
// Deliberately only 3 fields, not all 11 — picking every filled field would
// clutter every node. `nodeIndicators` is pure (no Vue/DOM) so the "which
// fields count, and in what order" policy is unit-tested independent of the
// SVG layout math (that part needs live node geometry, so it stays in
// DiagramTab.vue).
export const INDICATOR_DEFS = [
  { key: 'integrations', field: 'integrations', icon: 'link', title: 'Has integrations' },
  {
    key: 'controls_approvals',
    field: 'controls_approvals',
    icon: 'shield',
    title: 'Has controls / approvals',
  },
  { key: 'exceptions', field: 'exceptions', icon: 'alert-circle', title: 'Has exceptions' },
]

// step: a Map Step store row. Returns the subset of INDICATOR_DEFS whose
// field is non-blank, in INDICATOR_DEFS' own order.
export function nodeIndicators(step) {
  if (!step) return []
  return INDICATOR_DEFS.filter((def) => Boolean((step[def.field] || '').trim()))
}
