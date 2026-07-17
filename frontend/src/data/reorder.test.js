import { describe, it, expect } from 'vitest'
import { moveItem, resequence } from './reorder.js'

const rows = () => [
  { name: 'a', sequence: 1 },
  { name: 'b', sequence: 2 },
  { name: 'c', sequence: 3 },
]

describe('moveItem', () => {
  it('moves an item down without mutating the input', () => {
    const input = rows()
    const moved = moveItem(input, 0, 2)
    expect(moved.map((r) => r.name)).toEqual(['b', 'c', 'a'])
    expect(input.map((r) => r.name)).toEqual(['a', 'b', 'c'])
  })

  it('moves an item up', () => {
    const moved = moveItem(rows(), 2, 0)
    expect(moved.map((r) => r.name)).toEqual(['c', 'a', 'b'])
  })

  it('clamps out-of-range indexes', () => {
    const moved = moveItem(rows(), 0, 99)
    expect(moved.map((r) => r.name)).toEqual(['b', 'c', 'a'])
  })
})

describe('resequence', () => {
  it('returns only the rows whose sequence changed', () => {
    const reordered = moveItem(rows(), 0, 2) // b(2) c(3) a(1)
    expect(resequence(reordered)).toEqual([
      { name: 'b', sequence: 1 },
      { name: 'c', sequence: 2 },
      { name: 'a', sequence: 3 },
    ])
  })

  it('is empty when order is already dense and correct', () => {
    expect(resequence(rows())).toEqual([])
  })
})
