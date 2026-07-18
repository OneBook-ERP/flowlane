import { describe, it, expect } from 'vitest'
import { shapeGeometry, pointsAttr } from './nodeShapes.js'

const node = { x: 100, y: 100, w: 150, h: 60 }

describe('shapeGeometry', () => {
  it('draws a rounded rectangle for Process/Task', () => {
    const g = shapeGeometry({ ...node, shape: 'Rectangle' })
    expect(g).toMatchObject({ kind: 'rect', x: 25, y: 70, width: 150, height: 60 })
  })

  it('makes a stadium (rx = h/2) for a Terminator', () => {
    const g = shapeGeometry({ ...node, shape: 'Terminator' })
    expect(g.kind).toBe('rect')
    expect(g.rx).toBe(30)
  })

  it('emits four polygon points for a Diamond and Parallelogram', () => {
    expect(shapeGeometry({ ...node, shape: 'Diamond' }).points).toHaveLength(4)
    expect(shapeGeometry({ ...node, shape: 'Parallelogram' }).points).toHaveLength(4)
  })

  it('centres an ellipse for a Junction circle', () => {
    const g = shapeGeometry({ ...node, shape: 'Circle' })
    expect(g).toMatchObject({ kind: 'ellipse', cx: 100, cy: 100, rx: 75, ry: 30 })
  })

  it('falls back to a rectangle for an unknown shape', () => {
    expect(shapeGeometry({ ...node, shape: 'Nonsense' }).kind).toBe('rect')
  })
})

describe('pointsAttr', () => {
  it('serialises points to the SVG attribute form', () => {
    expect(pointsAttr([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('1,2 3,4')
  })
})
