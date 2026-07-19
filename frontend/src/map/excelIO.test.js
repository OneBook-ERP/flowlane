import { describe, it, expect } from 'vitest'
import { stepsToSheetRows, sheetRowsToFieldMaps, xlsxFilename } from './excelIO.js'
import { COLUMNS } from '@/components/editor/columns.js'
import { blankStep } from './steps.js'

describe('stepsToSheetRows', () => {
  it('writes a header row of all 15 column labels, then one row per step', () => {
    const step = blankStep({ step_id: 'S1', step_name: 'Receive Enquiry', kpis: 'Cycle time' })
    const rows = stepsToSheetRows([step])

    expect(rows[0]).toEqual(COLUMNS.map((column) => column.label))
    expect(rows).toHaveLength(2)
    expect(rows[1][COLUMNS.findIndex((c) => c.field === 'step_id')]).toBe('S1')
    expect(rows[1][COLUMNS.findIndex((c) => c.field === 'kpis')]).toBe('Cycle time')
  })

  it('exports zero steps as just the header row', () => {
    expect(stepsToSheetRows([])).toHaveLength(1)
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
