// Pure pain-point aggregation shared by the Diagram tab's "Risks" strip
// (UI-REVAMP §4) and the Pain Points tab (BACKLOG 2.5) — both As-Is and
// To-Be maps, no Vue/store/network. Reuses chipColors.js's severityRank/
// maxSeverity so "which severity sorts first / wins" is defined in exactly
// one place, shared with the per-node badge color.
import { severityRank, maxSeverity } from '@/ui/chipColors.js'

// steps: the Map Step store rows (each may carry `pain_points: [{ description,
// pain_type, severity }]`). Returns [{ uid, index, stepLabel, description,
// painType, severity }], High severity first, ties kept in step order (stable
// sort). `index` is the point's position within its OWN step's `pain_points`
// array — the Pain Points tab needs it to route edits/deletes back through
// store.setPainPoint(uid, index, …) / removePainPoint(uid, index); the Risks
// strip ignores it.
export function collectRisks(steps = []) {
  const risks = []
  steps.forEach((step) => {
    ;(step.pain_points || []).forEach((point, index) => {
      risks.push({
        uid: step.uid,
        index,
        stepLabel: step.step_id ? `${step.step_id} · ${step.step_name || 'Untitled'}` : step.step_name || 'Untitled',
        description: point.description || '(no description)',
        painType: point.pain_type || '',
        severity: point.severity || 'Low',
      })
    })
  })
  return risks
    .map((risk, i) => ({ risk, i }))
    .sort((a, b) => severityRank(b.risk.severity) - severityRank(a.risk.severity) || a.i - b.i)
    .map(({ risk }) => risk)
}

// Per-step summary for the Pain Points tab (BACKLOG 2.5): which steps carry
// pain points, each step's worst severity + count, and totals by severity —
// steps sorted worst-first (ties in original step order). Distinct from
// collectRisks: this groups by STEP (Pain Point's real parent, per the
// doctype's child-table shape) instead of flattening to one row per point.
export function summarizePainPoints(steps = []) {
  const bySeverity = { High: 0, Medium: 0, Low: 0 }
  const stepSummaries = []
  steps.forEach((step) => {
    const points = step.pain_points || []
    if (!points.length) return
    const severities = points.map((p) => p.severity || 'Low')
    severities.forEach((s) => {
      bySeverity[s] = (bySeverity[s] || 0) + 1
    })
    stepSummaries.push({
      uid: step.uid,
      stepLabel: step.step_id ? `${step.step_id} · ${step.step_name || 'Untitled'}` : step.step_name || 'Untitled',
      severity: maxSeverity(severities),
      count: points.length,
    })
  })
  const sorted = stepSummaries
    .map((summary, i) => ({ summary, i }))
    .sort((a, b) => severityRank(b.summary.severity) - severityRank(a.summary.severity) || a.i - b.i)
    .map(({ summary }) => summary)
  return {
    total: sorted.reduce((sum, s) => sum + s.count, 0),
    bySeverity,
    steps: sorted,
  }
}
