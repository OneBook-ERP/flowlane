// Pure helper for the Diagram tab's "Risks" strip (UI-REVAMP §4): flattens
// every As-Is step's `pain_points` child rows into one worst-first list, no
// Vue/store/network — the strip just renders what this returns. Reuses
// chipColors.js's severityRank so "which severity sorts first" is defined
// in exactly one place, shared with the per-node badge color.
import { severityRank } from '@/ui/chipColors.js'

// steps: the Map Step store rows (each may carry `pain_points: [{ description,
// pain_type, severity }]`). Returns [{ uid, stepLabel, description, painType,
// severity }], High severity first, ties kept in step order (stable sort).
export function collectRisks(steps = []) {
  const risks = []
  steps.forEach((step) => {
    ;(step.pain_points || []).forEach((point) => {
      risks.push({
        uid: step.uid,
        stepLabel: step.step_id ? `${step.step_id} · ${step.step_name || 'Untitled'}` : step.step_name || 'Untitled',
        description: point.description || '(no description)',
        painType: point.pain_type || '',
        severity: point.severity || 'Low',
      })
    })
  })
  return risks
    .map((risk, index) => ({ risk, index }))
    .sort((a, b) => severityRank(b.risk.severity) - severityRank(a.risk.severity) || a.index - b.index)
    .map(({ risk }) => risk)
}
