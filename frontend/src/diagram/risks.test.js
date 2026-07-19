import { describe, it, expect } from 'vitest'
import { collectRisks, summarizePainPoints } from './risks.js'

const steps = [
  {
    uid: 'a',
    step_id: 'S1',
    step_name: 'Receive Order',
    pain_points: [{ description: 'Manual re-entry', pain_type: 'Duplicate Data', severity: 'Low' }],
  },
  {
    uid: 'b',
    step_id: 'S2',
    step_name: 'Approve Quote',
    pain_points: [
      { description: 'No SLA', pain_type: 'Bottleneck', severity: 'High' },
      { description: 'Email only', pain_type: 'Manual Step', severity: 'Medium' },
    ],
  },
  { uid: 'c', step_id: 'S3', step_name: 'Ship Goods', pain_points: [] },
]

describe('collectRisks', () => {
  it('flattens pain points across steps, worst severity first', () => {
    const risks = collectRisks(steps)
    expect(risks.map((r) => r.severity)).toEqual(['High', 'Medium', 'Low'])
  })

  it('keeps ties in original step/point order (stable sort)', () => {
    const tied = [
      { uid: 'x', step_id: 'S1', step_name: 'A', pain_points: [{ description: 'first', severity: 'Medium' }] },
      { uid: 'y', step_id: 'S2', step_name: 'B', pain_points: [{ description: 'second', severity: 'Medium' }] },
    ]
    expect(collectRisks(tied).map((r) => r.description)).toEqual(['first', 'second'])
  })

  it('carries the owning step uid and a readable step label', () => {
    const [risk] = collectRisks(steps).filter((r) => r.description === 'No SLA')
    expect(risk.uid).toBe('b')
    expect(risk.stepLabel).toBe('S2 · Approve Quote')
  })

  it('returns an empty list for steps with no pain points', () => {
    expect(collectRisks([{ uid: 'z', pain_points: [] }])).toEqual([])
    expect(collectRisks([])).toEqual([])
  })

  it('defaults a missing severity to Low so it still sorts and colors sanely', () => {
    const risks = collectRisks([
      { uid: 'w', step_id: 'S1', pain_points: [{ description: 'no severity set' }] },
    ])
    expect(risks[0].severity).toBe('Low')
  })

  it('carries the point index within its OWN step so edits can be routed back', () => {
    const risks = collectRisks(steps)
    const [noSla, emailOnly] = risks.filter((r) => r.uid === 'b')
    expect(noSla.index).toBe(0)
    expect(emailOnly.index).toBe(1)
  })
})

describe('summarizePainPoints', () => {
  it('groups by step, worst severity first, and totals by severity', () => {
    const summary = summarizePainPoints(steps)
    expect(summary.steps.map((s) => s.uid)).toEqual(['b', 'a'])
    expect(summary.steps[0]).toMatchObject({ severity: 'High', count: 2 })
    expect(summary.total).toBe(3)
    expect(summary.bySeverity).toEqual({ High: 1, Medium: 1, Low: 1 })
  })

  it('omits steps with no pain points', () => {
    const summary = summarizePainPoints(steps)
    expect(summary.steps.some((s) => s.uid === 'c')).toBe(false)
  })

  it('returns an empty summary for a map with no pain points', () => {
    expect(summarizePainPoints([{ uid: 'z', pain_points: [] }])).toEqual({
      total: 0,
      bySeverity: { High: 0, Medium: 0, Low: 0 },
      steps: [],
    })
    expect(summarizePainPoints([]).total).toBe(0)
  })
})
