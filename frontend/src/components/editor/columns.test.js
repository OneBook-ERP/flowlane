import { describe, it, expect } from 'vitest'
import {
  COLUMNS,
  INDEX_COL_WIDTH,
  PASTE_FIELDS,
  stickyLeftOffsets,
  tableMinWidth,
} from './columns.js'

describe('columns', () => {
  it('keeps the six paste fields in positional order', () => {
    expect(PASTE_FIELDS).toEqual([
      'step_id',
      'step_name',
      'lane_role',
      'node_type',
      'trigger_input',
      'output_result',
    ])
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
    it('sums index + fields + trailing lanes and is wide enough to scroll', () => {
      const fields = COLUMNS.reduce((sum, c) => sum + c.min, 0)
      expect(tableMinWidth()).toBe(INDEX_COL_WIDTH + fields + 104 + 48)
      // As-Is adds the pain-point lane, widening the grid.
      expect(tableMinWidth(COLUMNS, { isAsIs: true })).toBeGreaterThan(tableMinWidth())
    })
  })
})
