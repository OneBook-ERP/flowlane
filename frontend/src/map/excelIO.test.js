import { describe, it, expect } from 'vitest'
import { stepsToSheetRows, sheetRowsToFieldMaps, xlsxFilename } from './excelIO.js'
import { COLUMNS } from '@/components/editor/columns.js'
import { blankStep } from './steps.js'

describe('stepsToSheetRows', () => {
  it('writes a header row of all 15 column labels plus Connections/Pain Points, then one row per step', () => {
    const step = blankStep({ step_id: 'S1', step_name: 'Receive Enquiry', kpis: 'Cycle time' })
    const rows = stepsToSheetRows([step])

    expect(rows[0]).toEqual([...COLUMNS.map((column) => column.label), 'Connections', 'Pain Points'])
    expect(rows).toHaveLength(2)
    expect(rows[1][COLUMNS.findIndex((c) => c.field === 'step_id')]).toBe('S1')
    expect(rows[1][COLUMNS.findIndex((c) => c.field === 'kpis')]).toBe('Cycle time')
  })

  it('exports zero steps as just the header row', () => {
    expect(stepsToSheetRows([])).toHaveLength(1)
  })

  it('encodes connections by the target step_id, with label/condition in ()/[]', () => {
    const from = blankStep({ step_id: 'S1', step_name: 'Approve?' })
    const to = blankStep({ step_id: 'S2', step_name: 'Ship' })
    from.connections = [{ to_uid: to.uid, label: 'Yes', condition: 'amount > 1000' }]
    const rows = stepsToSheetRows([from, to])
    const connCell = rows[1][rows[0].indexOf('Connections')]
    expect(connCell).toBe('S2 (Yes) [amount > 1000]')
  })

  it('joins multiple connections with the item separator', () => {
    const a = blankStep({ step_id: 'S1' })
    const b = blankStep({ step_id: 'S2' })
    const c = blankStep({ step_id: 'S3' })
    a.connections = [{ to_uid: b.uid, label: 'Yes' }, { to_uid: c.uid, label: 'No' }]
    const rows = stepsToSheetRows([a, b, c])
    const connCell = rows[1][rows[0].indexOf('Connections')]
    expect(connCell).toBe('S2 (Yes) | S3 (No)')
  })

  it('encodes pain points as "Severity: description (Type)"', () => {
    const step = blankStep({ step_id: 'S1' })
    step.pain_points = [
      { description: 'No SLA', pain_type: 'Bottleneck', severity: 'High' },
      { description: 'Manual re-entry', pain_type: '', severity: 'Low' },
    ]
    const rows = stepsToSheetRows([step])
    const painCell = rows[1][rows[0].indexOf('Pain Points')]
    expect(painCell).toBe('High: No SLA (Bottleneck) | Low: Manual re-entry')
  })
})

describe('sheetRowsToFieldMaps', () => {
  it('round-trips a full export back into the same field values', () => {
    const step = blankStep({ step_id: 'S1', step_name: 'Receive Enquiry', node_type: 'Start/End' })
    const rows = stepsToSheetRows([step])

    const [fieldMap] = sheetRowsToFieldMaps(rows)
    expect(fieldMap.step_id).toBe('S1')
    expect(fieldMap.step_name).toBe('Receive Enquiry')
    expect(fieldMap.node_type).toBe('Start/End')
  })

  it('matches columns by header label even when re-ordered', () => {
    const rows = [
      ['Step Name', 'Step ID'],
      ['Receive Enquiry', 'S1'],
    ]
    const [fieldMap] = sheetRowsToFieldMaps(rows)
    expect(fieldMap.step_name).toBe('Receive Enquiry')
    expect(fieldMap.step_id).toBe('S1')
  })

  it('falls back to position for an unrecognised header (plain AI-generated block)', () => {
    const rows = [
      ['Step', 'Name'],
      ['S1', 'Receive Enquiry'],
    ]
    const [fieldMap] = sheetRowsToFieldMaps(rows)
    expect(fieldMap.step_id).toBe('S1')
    expect(fieldMap.step_name).toBe('Receive Enquiry')
  })

  it('drops fully blank rows and coerces numeric cells to strings', () => {
    const rows = [
      ['Step ID', 'Step Name'],
      ['S1', 'Receive Enquiry'],
      ['', ''],
      [42, ''],
    ]
    const maps = sheetRowsToFieldMaps(rows)
    expect(maps).toHaveLength(2)
    expect(maps[1].step_id).toBe('42')
  })

  it('returns an empty array for a sheet with only a header row', () => {
    expect(sheetRowsToFieldMaps([['Step ID', 'Step Name']])).toEqual([])
  })

  it('returns an empty array for no rows at all', () => {
    expect(sheetRowsToFieldMaps([])).toEqual([])
  })

  it('round-trips connections and pain points through export -> import', () => {
    const from = blankStep({ step_id: 'S1', step_name: 'Approve?' })
    const to = blankStep({ step_id: 'S2', step_name: 'Ship' })
    from.connections = [{ to_uid: to.uid, label: 'Yes', condition: 'amount > 1000' }]
    from.pain_points = [{ description: 'No SLA', pain_type: 'Bottleneck', severity: 'High' }]

    const [fromMap] = sheetRowsToFieldMaps(stepsToSheetRows([from, to]))
    expect(fromMap.connections).toEqual([{ to_step_id: 'S2', label: 'Yes', condition: 'amount > 1000' }])
    expect(fromMap.pain_points).toEqual([{ description: 'No SLA', pain_type: 'Bottleneck', severity: 'High' }])
  })

  it('leaves .connections/.pain_points undefined when the file has no such column', () => {
    const rows = [
      ['Step ID', 'Step Name'],
      ['S1', 'Receive Enquiry'],
    ]
    const [fieldMap] = sheetRowsToFieldMaps(rows)
    expect(fieldMap.connections).toBeUndefined()
    expect(fieldMap.pain_points).toBeUndefined()
  })

  it('defaults an unrecognised/missing severity to Low when decoding pain points', () => {
    const rows = [
      [...COLUMNS.map((c) => c.label), 'Connections', 'Pain Points'],
      [...COLUMNS.map(() => ''), '', 'Email only'],
    ]
    const [fieldMap] = sheetRowsToFieldMaps(rows)
    expect(fieldMap.pain_points).toEqual([{ description: 'Email only', pain_type: '', severity: 'Low' }])
  })
})

describe('xlsxFilename', () => {
  it('slugifies a map title', () => {
    expect(xlsxFilename('Order to Cash')).toBe('order-to-cash.xlsx')
  })

  it('falls back to a default name when blank', () => {
    expect(xlsxFilename('')).toBe('flowlane-map.xlsx')
    expect(xlsxFilename(undefined)).toBe('flowlane-map.xlsx')
  })
})
