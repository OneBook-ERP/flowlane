import { describe, it, expect } from 'vitest'
import {
  COLUMNS,
  GROUPS,
  INDEX_COL_WIDTH,
  PASTE_FIELDS,
  columnsByGroup,
  pasteFieldLabel,
  stickyLeftOffsets,
  tableMinWidth,
} from './columns.js'

describe('columns', () => {
  it('keeps the eight paste fields in positional order, ending with connections/pain points', () => {
    expect(PASTE_FIELDS).toEqual([
      'step_id',
      'step_name',
      'lane_role',
      'node_type',
      'trigger_input',
      'output_result',
      'connections',
      'pain_points',
    ])
  })

  describe('pasteFieldLabel', () => {
    it('uses the COLUMNS label for a real scalar field', () => {
      expect(pasteFieldLabel('step_id')).toBe('Step ID')
    })

    it('has a readable label for the two synthetic child-table fields', () => {
      expect(pasteFieldLabel('connections')).toBe('Connections')
      expect(pasteFieldLabel('pain_points')).toBe('Pain Points')
    })
  })

  it('exposes all 15 map-step fields', () => {
    expect(COLUMNS).toHaveLength(15)
  })

  describe('stickyLeftOffsets', () => {
    it('starts the first sticky column after the index lane and stacks the rest', () => {
      const offsets = stickyLeftOffsets()
      const sticky = COLUMNS.filter((c) => c.sticky)
      expect(Object.keys(offsets)).toEqual(sticky.map((c) => c.field))
      // Step ID sits right after the index lane; Step Name after Step ID.
      expect(offsets.step_id).toBe(INDEX_COL_WIDTH)
      expect(offsets.step_name).toBe(INDEX_COL_WIDTH + sticky[0].min)
    })

    it('never offsets non-sticky columns', () => {
      const offsets = stickyLeftOffsets()
      expect(offsets.lane_role).toBeUndefined()
    })
  })

  describe('tableMinWidth', () => {
    it('sums index + fields + connections + pain + delete lanes', () => {
      const fields = COLUMNS.reduce((sum, c) => sum + c.min, 0)
      // Pain lane is always counted (BACKLOG 2.5: no more As-Is-only gate).
      expect(tableMinWidth()).toBe(INDEX_COL_WIDTH + fields + 104 + 88 + 48)
    })
  })

  describe('columnsByGroup', () => {
    it('places every field in exactly one group, in GROUPS order', () => {
      const grouped = columnsByGroup()
      expect(grouped.map((g) => g.group)).toEqual(GROUPS)
      const total = grouped.reduce((sum, g) => sum + g.fields.length, 0)
      expect(total).toBe(COLUMNS.length)
      // No field is dropped or duplicated across groups.
      const seen = new Set(grouped.flatMap((g) => g.fields.map((f) => f.field)))
      expect(seen.size).toBe(COLUMNS.length)
    })

    it('matches the UI-REVAMP D4 tab grouping', () => {
      const grouped = columnsByGroup()
      const fieldsOf = (group) => grouped.find((g) => g.group === group).fields.map((f) => f.field)
      expect(fieldsOf('General')).toEqual([
        'step_id',
        'step_name',
        'lane_role',
        'node_type',
        'workflow_state',
      ])
      expect(fieldsOf('Input/Output')).toEqual(['trigger_input', 'output_result', 'key_data_fields'])
      expect(fieldsOf('Logic & Rules')).toEqual([
        'business_rules',
        'exceptions',
        'controls_approvals',
        'kpis',
      ])
      expect(fieldsOf('ERPNext Setup')).toEqual(['erpnext_module', 'erpnext_doctype', 'integrations'])
    })
  })
})
