import { describe, it, expect } from 'vitest'
import { filterClients } from './clientFilter.js'

const CLIENTS = [
  { client_name: 'Meridian Foods', industry_vertical: 'Manufacturing' },
  { client_name: 'Northwind Traders', industry_vertical: 'Distribution' },
  { client_name: 'Contoso Pharma', industry_vertical: 'Healthcare' },
]

describe('filterClients', () => {
  it('returns every client for a blank query', () => {
    expect(filterClients(CLIENTS, '')).toEqual(CLIENTS)
    expect(filterClients(CLIENTS, '   ')).toEqual(CLIENTS)
  })

  it('matches client_name case-insensitively', () => {
    expect(filterClients(CLIENTS, 'meridian')).toEqual([CLIENTS[0]])
  })

  it('matches industry_vertical too', () => {
    expect(filterClients(CLIENTS, 'healthcare')).toEqual([CLIENTS[2]])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterClients(CLIENTS, 'zzz')).toEqual([])
  })
})
