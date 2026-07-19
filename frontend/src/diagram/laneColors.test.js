import { describe, it, expect } from 'vitest'
import { laneTint, LANE_TINT_COUNT } from './laneColors.js'

describe('laneTint', () => {
  it('gives each of the first N lanes a distinct tint', () => {
    const tints = Array.from({ length: LANE_TINT_COUNT }, (_, i) => laneTint(i).fill)
    expect(new Set(tints).size).toBe(LANE_TINT_COUNT)
  })

  it('cycles back to the first hue once lanes exceed the palette size', () => {
    expect(laneTint(0)).toEqual(laneTint(LANE_TINT_COUNT))
    expect(laneTint(1)).toEqual(laneTint(LANE_TINT_COUNT + 1))
  })

  it('every tint has fill, label and stroke', () => {
    for (let i = 0; i < LANE_TINT_COUNT; i++) {
      const tint = laneTint(i)
      expect(tint.fill).toMatch(/^#[0-9a-f]{6}$/)
      expect(tint.label).toMatch(/^#[0-9a-f]{6}$/)
      expect(tint.stroke).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('is deterministic for the same index', () => {
    expect(laneTint(3)).toEqual(laneTint(3))
  })
})
