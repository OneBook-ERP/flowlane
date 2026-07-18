import { describe, it, expect } from 'vitest'
import { laneAtCross } from './laneHit.js'

const LANES = [
  { role: 'Sales', pos: 40, size: 130 },
  { role: 'Ops', pos: 170, size: 130 },
  { role: 'Finance', pos: 300, size: 130 },
]

describe('laneAtCross', () => {
  it('returns null for no lanes', () => {
    expect(laneAtCross([], 100)).toBe(null)
    expect(laneAtCross(null, 100)).toBe(null)
  })

  it('finds the band containing the coordinate', () => {
    expect(laneAtCross(LANES, 50)).toBe('Sales')
    expect(laneAtCross(LANES, 200)).toBe('Ops')
    expect(laneAtCross(LANES, 350)).toBe('Finance')
  })

  it('is inclusive of a band start and exclusive of its end', () => {
    expect(laneAtCross(LANES, 170)).toBe('Ops') // exactly the next band's start
    expect(laneAtCross(LANES, 169.999)).toBe('Sales')
  })

  it('clamps a drop before the first band to the first lane', () => {
    expect(laneAtCross(LANES, 0)).toBe('Sales')
  })

  it('clamps a drop past the last band to the last lane', () => {
    expect(laneAtCross(LANES, 999)).toBe('Finance')
  })
})
