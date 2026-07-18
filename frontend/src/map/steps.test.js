import { describe, it, expect } from 'vitest'
import {
  blankStep,
  fromServerStep,
  toSavePayload,
  mergeUidMap,
} from './steps.js'

describe('blankStep', () => {
  it('creates a row with a uid, no name, and default node type', () => {
    const step = blankStep()
    expect(step.uid).toMatch(/^new-/)
    expect(step.name).toBe('')
    expect(step.node_type).toBe('Process/Task')
    expect(step.connections).toEqual([])
  })

  it('applies overrides (used by Excel paste)', () => {
    const step = blankStep({ step_id: 'S1', step_name: 'Receive' })
    expect(step.step_id).toBe('S1')
    expect(step.step_name).toBe('Receive')
  })

  it('gives each row a distinct uid', () => {
    expect(blankStep().uid).not.toBe(blankStep().uid)
  })
})

describe('fromServerStep', () => {
  it('uses the server name as uid and maps to_step edges to to_uid', () => {
    const step = fromServerStep({
      name: 'abc',
      step_id: 'S1',
      step_name: 'One',
      connections: [{ to_step: 'def', label: 'Yes', condition: 'ok' }],
      pain_points: [{ description: 'slow', severity: 'High' }],
    })
    expect(step.uid).toBe('abc')
    expect(step.name).toBe('abc')
    expect(step.connections[0]).toEqual({ to_uid: 'def', label: 'Yes', condition: 'ok' })
    expect(step.pain_points[0].description).toBe('slow')
  })
})

describe('toSavePayload', () => {
  const rows = () => [
    { uid: 'a', name: '', step_id: 'S1', step_name: 'One', connections: [{ to_uid: 'b', label: 'go' }] },
    { uid: 'b', name: '', step_id: 'S2', step_name: 'Two', connections: [] },
  ]

  it('assigns dense 1..n sequence from array order', () => {
    const payload = toSavePayload(rows())
    expect(payload.map((s) => s.sequence)).toEqual([1, 2])
  })

  it('keeps connections to live rows', () => {
    const payload = toSavePayload(rows())
    expect(payload[0].connections).toEqual([{ to_uid: 'b', label: 'go', condition: '' }])
  })

  it('drops connections whose target row no longer exists (TC2.5)', () => {
    const only = [rows()[0]] // row "a" still points at removed "b"
    const payload = toSavePayload(only)
    expect(payload[0].connections).toEqual([])
  })
})

describe('manual position round-trip (T3.7)', () => {
  it('blank rows start with no manual position', () => {
    const step = blankStep()
    expect(step.manual_x).toBeNull()
    expect(step.manual_y).toBeNull()
  })

  it('loads numeric manual positions from the server row', () => {
    const step = fromServerStep({ name: 'a', manual_x: 120.5, manual_y: 40 })
    expect(step.manual_x).toBe(120.5)
    expect(step.manual_y).toBe(40)
  })

  it('sends positions as numbers, and null (never "") when unset', () => {
    const payload = toSavePayload([
      { uid: 'a', name: '', manual_x: 300, manual_y: 90, connections: [] },
      { uid: 'b', name: '', manual_x: null, manual_y: null, connections: [] },
    ])
    expect(payload[0].manual_x).toBe(300)
    expect(payload[0].manual_y).toBe(90)
    expect(payload[1].manual_x).toBeNull()
    expect(payload[1].manual_y).toBeNull()
  })
})

describe('mergeUidMap', () => {
  it('copies saved names onto new rows so they update next save', () => {
    const steps = [
      { uid: 'a', name: '' },
      { uid: 'b', name: 'existing' },
    ]
    mergeUidMap(steps, { a: 'fresh-name' })
    expect(steps[0].name).toBe('fresh-name')
    expect(steps[1].name).toBe('existing')
  })
})
