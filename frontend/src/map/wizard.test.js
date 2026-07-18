import { describe, it, expect } from 'vitest'
import { isDecisionType, nextBranchLabel, clampIndex } from './wizard.js'

describe('isDecisionType', () => {
  it('is true only for the Decision node type', () => {
    expect(isDecisionType('Decision')).toBe(true)
    expect(isDecisionType('Process/Task')).toBe(false)
    expect(isDecisionType('')).toBe(false)
  })
})

describe('nextBranchLabel', () => {
  it('suggests Yes for the first branch', () => {
    expect(nextBranchLabel([])).toBe('Yes')
  })

  it('suggests No once Yes is taken (case/space-insensitive)', () => {
    expect(nextBranchLabel([' yes '])).toBe('No')
  })

  it('returns blank once both defaults are used', () => {
    expect(nextBranchLabel(['Yes', 'No'])).toBe('')
  })
})

describe('clampIndex', () => {
  it('keeps an in-range index unchanged', () => {
    expect(clampIndex(1, 3)).toBe(1)
  })

  it('clamps past the ends into range', () => {
    expect(clampIndex(5, 3)).toBe(2)
    expect(clampIndex(-2, 3)).toBe(0)
  })

  it('returns 0 for an empty list', () => {
    expect(clampIndex(3, 0)).toBe(0)
  })
})
