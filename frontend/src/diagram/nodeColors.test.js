import { describe, it, expect } from 'vitest'
import { nodeTypeColor, NODE_TYPE_NAMES } from './nodeColors.js'

describe('nodeTypeColor', () => {
  it('covers exactly the five seeded node types', () => {
    expect(NODE_TYPE_NAMES).toEqual([
      'Start/End',
      'Process/Task',
      'Decision',
      'Input/Output',
      'Junction',
    ])
  })

  it('gives each node type a distinct dot hue', () => {
    const dots = NODE_TYPE_NAMES.map((n) => nodeTypeColor(n).dot)
    expect(new Set(dots).size).toBe(NODE_TYPE_NAMES.length)
  })

  it('pairs every dot class with a matching hex', () => {
    for (const name of NODE_TYPE_NAMES) {
      const c = nodeTypeColor(name)
      expect(c.dot).toMatch(/^bg-/)
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('falls back to a neutral dot for empty or unknown types', () => {
    const fallback = nodeTypeColor('')
    expect(fallback).toEqual(nodeTypeColor('Not A Type'))
    expect(fallback.dot).toMatch(/^bg-gray-/)
    // fallback must not collide with a real node-type hue
    const known = NODE_TYPE_NAMES.map((n) => nodeTypeColor(n).dot)
    expect(known).not.toContain(fallback.dot)
  })
})
