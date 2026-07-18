import { describe, it, expect } from 'vitest'
import { statusChip, mapTypeChip, clientStatusChip, severityChip, maxSeverity } from './chipColors.js'

describe('statusChip', () => {
  it('gives each workflow status a distinct low-saturation chip', () => {
    const classes = ['Draft', 'In Review', 'Approved'].map((s) => statusChip(s).classes)
    expect(new Set(classes).size).toBe(3)
  })

  it('falls back to neutral for an unknown status', () => {
    expect(statusChip('Weird')).toEqual(statusChip('Draft'))
  })
})

describe('mapTypeChip', () => {
  it('keeps As-Is amber and To-Be green (matches the original MapBadge)', () => {
    expect(mapTypeChip('As-Is').classes).toContain('amber')
    expect(mapTypeChip('To-Be').classes).toContain('green')
  })
})

describe('clientStatusChip', () => {
  it('gives each client status a distinct chip', () => {
    const classes = ['Active', 'Prospect', 'Archived'].map((s) => clientStatusChip(s).classes)
    expect(new Set(classes).size).toBe(3)
  })
})

describe('severityChip', () => {
  it('colors Medium amber and High red per the plan', () => {
    expect(severityChip('Medium').classes).toContain('amber')
    expect(severityChip('High').classes).toContain('red')
  })

  it('gives every severity a hex for SVG use, and defaults unknowns to Low', () => {
    for (const s of ['Low', 'Medium', 'High']) {
      expect(severityChip(s).hex).toMatch(/^#[0-9a-f]{6}$/)
    }
    expect(severityChip('')).toEqual(severityChip('Low'))
  })
})

describe('maxSeverity', () => {
  it('picks the highest-ranked severity present', () => {
    expect(maxSeverity(['Low', 'High', 'Medium'])).toBe('High')
    expect(maxSeverity(['Low', 'Medium'])).toBe('Medium')
    expect(maxSeverity([])).toBe('Low')
  })
})
