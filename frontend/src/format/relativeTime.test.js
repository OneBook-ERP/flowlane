import { describe, it, expect } from 'vitest'
import { relativeTime } from './relativeTime.js'

const NOW = new Date('2026-07-17T12:00:00Z')

describe('relativeTime', () => {
  it('returns blank for a missing date', () => {
    expect(relativeTime('', NOW)).toBe('')
    expect(relativeTime(null, NOW)).toBe('')
  })

  it('returns blank for an unparsable date', () => {
    expect(relativeTime('not-a-date', NOW)).toBe('')
  })

  it('collapses anything under a minute to "just now"', () => {
    expect(relativeTime(new Date(NOW.getTime() - 30 * 1000), NOW)).toBe('just now')
  })

  it('picks the largest whole unit', () => {
    expect(relativeTime(new Date(NOW.getTime() - 5 * 60 * 1000), NOW)).toBe('5m ago')
    expect(relativeTime(new Date(NOW.getTime() - 3 * 60 * 60 * 1000), NOW)).toBe('3h ago')
    expect(relativeTime(new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000), NOW)).toBe('2d ago')
    expect(relativeTime(new Date(NOW.getTime() - 9 * 24 * 60 * 60 * 1000), NOW)).toBe('1w ago')
    expect(relativeTime(new Date(NOW.getTime() - 40 * 24 * 60 * 60 * 1000), NOW)).toBe('1mo ago')
    expect(relativeTime(new Date(NOW.getTime() - 400 * 24 * 60 * 60 * 1000), NOW)).toBe('1y ago')
  })

  it('accepts a string date the same as a Date object', () => {
    expect(relativeTime('2026-07-15T12:00:00Z', NOW)).toBe('2d ago')
  })
})
