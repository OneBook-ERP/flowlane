import { describe, it, expect } from 'vitest'
import { nodeIndicators, INDICATOR_DEFS } from './nodeIndicators.js'

describe('nodeIndicators', () => {
  it('returns nothing for a null/undefined step', () => {
    expect(nodeIndicators(null)).toEqual([])
    expect(nodeIndicators(undefined)).toEqual([])
  })

  it('returns nothing when all three fields are blank', () => {
    expect(nodeIndicators({ integrations: '', controls_approvals: '', exceptions: '' })).toEqual([])
    expect(nodeIndicators({})).toEqual([])
  })

  it('flags a single filled field', () => {
    const result = nodeIndicators({ integrations: 'ERP sync' })
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('integrations')
    expect(result[0].icon).toBe('link')
  })

  it('flags multiple filled fields, in INDICATOR_DEFS order regardless of input order', () => {
    const result = nodeIndicators({
      exceptions: 'Timeout after 30s',
      integrations: 'ERP sync',
    })
    expect(result.map((r) => r.key)).toEqual(['integrations', 'exceptions'])
  })

  it('treats whitespace-only values as blank', () => {
    expect(nodeIndicators({ controls_approvals: '   ' })).toEqual([])
  })

  it('flags all three when every field is filled', () => {
    const result = nodeIndicators({
      integrations: 'ERP sync',
      controls_approvals: 'Manager sign-off',
      exceptions: 'Timeout after 30s',
    })
    expect(result.map((r) => r.key)).toEqual(INDICATOR_DEFS.map((d) => d.key))
  })

  it('every def has a distinct icon and a non-empty title', () => {
    const icons = INDICATOR_DEFS.map((d) => d.icon)
    expect(new Set(icons).size).toBe(INDICATOR_DEFS.length)
    for (const def of INDICATOR_DEFS) {
      expect(def.title.length).toBeGreaterThan(0)
    }
  })
})
