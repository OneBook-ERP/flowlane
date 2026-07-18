// Store-driver test for the single-source-of-truth property StepInspector (UI
// step U3) depends on: every field editor it mounts (Table's GridCell) and
// every sub-editor it reuses (ConnectionsList, PainPointEditor) write through
// these exact mutators, never a per-view copy. Simulating a "Diagram node
// click" edit (StepInspector docked in MapSettingsInspector's right column,
// driven by DiagramTab's selection — see MapWorkspace.vue) and reading it
// back the way a "Wizard/Table mount" would (findStep / state.steps) proves
// Table, Wizard and Diagram can never diverge — they are three views over the
// one reactive store object. `call` (the network layer) is mocked so this
// stays a pure store test with no live save.
import { describe, it, expect, vi } from 'vitest'

vi.mock('frappe-ui', () => ({ call: vi.fn().mockResolvedValue({ uid_map: {} }) }))

const { createMapStore } = await import('./useMapStore.js')

describe('createMapStore — single source of truth across mount points', () => {
  it('a field edit made through one mount is visible to every other reader', () => {
    const store = createMapStore('Test Map')
    const step = store.addStep({ step_id: 'S1', step_name: 'Original', node_type: 'Process/Task' })

    // GridCell.onInput calls exactly this — the same mutator regardless of
    // whether the cell is rendered inside the Table grid, WizardTab's
    // StepInspector mount, or MapSettingsInspector's StepInspector mount
    // (shown when a Diagram node is selected).
    store.setField(step.uid, 'step_name', 'Renamed via Diagram node panel')

    // Read back the way the Wizard rail / Table row would (store.findStep and
    // the raw state.steps array) — no separate copy to fall out of sync.
    expect(store.findStep(step.uid).step_name).toBe('Renamed via Diagram node panel')
    expect(store.state.steps.find((s) => s.uid === step.uid).step_name).toBe(
      'Renamed via Diagram node panel'
    )
  })

  it('ConnectionsList/PainPointEditor mutators write onto the same row both StepInspector mounts read', () => {
    const store = createMapStore('Test Map')
    const from = store.addStep({ step_id: 'A' })
    const to = store.addStep({ step_id: 'B' })

    // What StepInspector's Connections tab (ConnectionsList) and Pain Points
    // tab (PainPointEditor) call.
    store.addConnection(from.uid, { to_uid: to.uid, label: 'Yes' })
    store.addPainPoint(from.uid, { description: 'Manual re-entry into Excel', severity: 'High' })

    const row = store.findStep(from.uid)
    expect(row.connections).toEqual([{ to_uid: to.uid, label: 'Yes', condition: '' }])
    expect(row.pain_points).toEqual([
      { description: 'Manual re-entry into Excel', pain_type: '', severity: 'High' },
    ])

    // The same row object is what any StepInspector instance would receive as
    // its `step` prop (store.findStep(uid) / state.steps element) — not a copy.
    expect(store.state.steps.find((s) => s.uid === from.uid)).toBe(row)
  })
})
