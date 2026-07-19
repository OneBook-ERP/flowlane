import { describe, it, expect } from 'vitest'
import { upsertStepsFromImport } from './excelImport.js'
import { blankStep } from './steps.js'

describe('upsertStepsFromImport', () => {
  it('updates an existing row matched by step_id instead of appending a duplicate (BUG FIX)', () => {
    const steps = [blankStep({ step_id: 'S1', step_name: 'Old name' })]
    const { added, updated } = upsertStepsFromImport(steps, [
      { step_id: 'S1', step_name: 'New name' },
    ])
    expect(added).toBe(0)
    expect(updated).toBe(1)
    expect(steps).toHaveLength(1)
    expect(steps[0].step_name).toBe('New name')
  })

  it('appends a new row when step_id has no existing match', () => {
    const steps = [blankStep({ step_id: 'S1' })]
    const { added, updated } = upsertStepsFromImport(steps, [{ step_id: 'S2', step_name: 'New step' }])
    expect(added).toBe(1)
    expect(updated).toBe(0)
    expect(steps).toHaveLength(2)
    expect(steps[1].step_name).toBe('New step')
  })

  it('preserves the matched row uid/name identity (a save updates it, never re-inserts)', () => {
    const steps = [blankStep({ step_id: 'S1' })]
    steps[0].name = 'existing-server-name'
    const uidBefore = steps[0].uid
    upsertStepsFromImport(steps, [{ step_id: 'S1', step_name: 'Edited' }])
    expect(steps[0].uid).toBe(uidBefore)
    expect(steps[0].name).toBe('existing-server-name')
  })

  it('overwrites pain_points wholesale when the import row carries them', () => {
    const steps = [blankStep({ step_id: 'S1' })]
    steps[0].pain_points = [{ description: 'old pain', pain_type: '', severity: 'Low' }]
    upsertStepsFromImport(steps, [
      { step_id: 'S1', pain_points: [{ description: 'new pain', pain_type: '', severity: 'High' }] },
    ])
    expect(steps[0].pain_points).toEqual([{ description: 'new pain', pain_type: '', severity: 'High' }])
  })

  it('leaves existing pain_points untouched when the import has no pain_points key', () => {
    const steps = [blankStep({ step_id: 'S1' })]
    steps[0].pain_points = [{ description: 'keep me', pain_type: '', severity: 'Low' }]
    upsertStepsFromImport(steps, [{ step_id: 'S1', step_name: 'Edited' }])
    expect(steps[0].pain_points).toEqual([{ description: 'keep me', pain_type: '', severity: 'Low' }])
  })

  it('resolves connections by step_id, including links between two rows in the same import', () => {
    const steps = []
    const { added } = upsertStepsFromImport(steps, [
      { step_id: 'S1', step_name: 'Approve?', connections: [{ to_step_id: 'S2', label: 'Yes', condition: '' }] },
      { step_id: 'S2', step_name: 'Ship' },
    ])
    expect(added).toBe(2)
    const from = steps.find((s) => s.step_id === 'S1')
    const to = steps.find((s) => s.step_id === 'S2')
    expect(from.connections).toEqual([{ to_uid: to.uid, label: 'Yes', condition: '' }])
  })

  it('drops a connection whose target step_id does not resolve to anything', () => {
    const steps = []
    upsertStepsFromImport(steps, [
      { step_id: 'S1', connections: [{ to_step_id: 'GHOST', label: '', condition: '' }] },
    ])
    expect(steps[0].connections).toEqual([])
  })

  it('leaves an existing row untouched by connection resolution when the file has no Connections column', () => {
    const steps = [blankStep({ step_id: 'S1' })]
    const target = blankStep({ step_id: 'S2' })
    steps.push(target)
    steps[0].connections = [{ to_uid: target.uid, label: 'Yes', condition: '' }]
    upsertStepsFromImport(steps, [{ step_id: 'S1', step_name: 'Edited' }])
    expect(steps[0].connections).toEqual([{ to_uid: target.uid, label: 'Yes', condition: '' }])
  })

  it('never leaks the internal _importedConnections staging field', () => {
    const steps = []
    upsertStepsFromImport(steps, [{ step_id: 'S1', connections: [] }])
    expect(steps[0]._importedConnections).toBeUndefined()
  })
})
