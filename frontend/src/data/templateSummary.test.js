import { describe, it, expect } from 'vitest'
import { templatesForModules, summarizeApplyResult } from './templateSummary.js'

const TEMPLATES = [
  { module: 'Selling', process_name: 'Quote-to-Cash' },
  { module: 'Buying', process_name: 'Procure-to-Pay' },
  { module: 'HR', process_name: 'Hire-to-Retire' },
]

describe('templatesForModules', () => {
  it('returns nothing when no modules are selected', () => {
    expect(templatesForModules(TEMPLATES, [])).toEqual([])
    expect(templatesForModules(TEMPLATES, undefined)).toEqual([])
  })

  it('filters to only the selected modules, preserving template order', () => {
    expect(templatesForModules(TEMPLATES, ['HR', 'Selling'])).toEqual([
      TEMPLATES[0],
      TEMPLATES[2],
    ])
  })

  it('ignores selected modules with no matching template', () => {
    expect(templatesForModules(TEMPLATES, ['Assets'])).toEqual([])
  })

  it('is safe against a missing templates list', () => {
    expect(templatesForModules(undefined, ['Selling'])).toEqual([])
  })
})

describe('summarizeApplyResult', () => {
  it('reports created processes', () => {
    expect(summarizeApplyResult({ created: ['Quote-to-Cash', 'Procure-to-Pay'], skipped: [] })).toBe(
      'Created Quote-to-Cash, Procure-to-Pay.'
    )
  })

  it('reports skipped processes with correct singular/plural', () => {
    expect(summarizeApplyResult({ created: [], skipped: ['Quote-to-Cash'] })).toBe(
      '1 already existed and was skipped.'
    )
    expect(summarizeApplyResult({ created: [], skipped: ['A', 'B'] })).toBe(
      '2 already existed and were skipped.'
    )
  })

  it('combines created and skipped in one sentence', () => {
    expect(summarizeApplyResult({ created: ['Quote-to-Cash'], skipped: ['Procure-to-Pay'] })).toBe(
      'Created Quote-to-Cash; 1 already existed and was skipped.'
    )
  })

  it('returns an empty string when nothing happened', () => {
    expect(summarizeApplyResult({ created: [], skipped: [] })).toBe('')
    expect(summarizeApplyResult()).toBe('')
  })
})
