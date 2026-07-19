import { describe, it, expect } from 'vitest'
import { mapBaseName, uniqueFilenames } from './bulkFilenames.js'

function row(process, sub, mapTitle) {
  return { map_title: mapTitle, process: { process_name: process }, sub: { title: sub } }
}

describe('mapBaseName', () => {
  it('slugifies process / sub-process / map title into one name', () => {
    expect(mapBaseName(row('Quote to Cash', 'Lead Management', 'As-Is'))).toBe(
      'quote-to-cash-lead-management-as-is'
    )
  })

  it('falls back to a default name when everything is blank', () => {
    expect(mapBaseName({})).toBe('flowlane-map')
  })
})

describe('uniqueFilenames', () => {
  it('appends the extension to each row unchanged when names differ', () => {
    const rows = [row('Quote to Cash', 'Lead Mgmt', 'As-Is'), row('Procure to Pay', 'Payment', 'As-Is')]
    expect(uniqueFilenames(rows, 'png')).toEqual([
      'quote-to-cash-lead-mgmt-as-is.png',
      'procure-to-pay-payment-as-is.png',
    ])
  })

  it('de-duplicates identical base names with a numeric suffix', () => {
    const rows = [row('Quote to Cash', 'Lead Mgmt', 'As-Is'), row('Quote to Cash', 'Lead Mgmt', 'As-Is')]
    expect(uniqueFilenames(rows, 'png')).toEqual([
      'quote-to-cash-lead-mgmt-as-is.png',
      'quote-to-cash-lead-mgmt-as-is-2.png',
    ])
  })

  it('handles three-way collisions in order', () => {
    const rows = [row('A', 'B', 'C'), row('A', 'B', 'C'), row('A', 'B', 'C')]
    expect(uniqueFilenames(rows, 'png').map((n) => n)).toEqual([
      'a-b-c.png',
      'a-b-c-2.png',
      'a-b-c-3.png',
    ])
  })
})
