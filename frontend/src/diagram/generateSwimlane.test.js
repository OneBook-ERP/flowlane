import { describe, it, expect } from 'vitest'
import { generateSwimlane } from './generateSwimlane.js'

// Terse builder: one step with optional connections by target step_id.
function step(id, overrides = {}) {
  return {
    step_id: id,
    step_name: overrides.step_name || id,
    lane_role: overrides.lane_role || 'Sales',
    node_type: overrides.node_type || 'Process/Task',
    shape: overrides.shape,
    manual_x: overrides.manual_x,
    manual_y: overrides.manual_y,
    connections: overrides.connections || [],
  }
}

function edge(to, label) {
  return { to_step_id: to, label: label || '' }
}

describe('generateSwimlane — TC3.1 linear chain', () => {
  const steps = [
    step('S1', { node_type: 'Start/End', connections: [edge('S2')] }),
    step('S2', { connections: [edge('S3')] }),
    step('S3', { connections: [edge('S4')] }),
    step('S4', { node_type: 'Start/End' }),
  ]

  it('lays a 4-step chain into 4 columns, one lane, 3 edges', () => {
    const g = generateSwimlane(steps, 'LR')
    expect(g.lanes).toHaveLength(1)
    expect(g.nodes).toHaveLength(4)
    expect(g.edges).toHaveLength(3)
    const col = Object.fromEntries(g.nodes.map((n) => [n.step_id, n.col]))
    expect([col.S1, col.S2, col.S3, col.S4]).toEqual([0, 1, 2, 3])
  })

  it('keeps every node in the single lane band', () => {
    const g = generateSwimlane(steps, 'LR')
    expect(g.nodes.every((n) => n.laneIndex === 0)).toBe(true)
  })

  it('resolves shapes from node type', () => {
    const g = generateSwimlane(steps, 'LR')
    const byId = Object.fromEntries(g.nodes.map((n) => [n.step_id, n.shape]))
    expect(byId.S1).toBe('Terminator')
    expect(byId.S2).toBe('Rectangle')
  })
})

describe('generateSwimlane — TC3.2 decision branches', () => {
  const steps = [
    step('S1', { connections: [edge('D1')] }),
    step('D1', { node_type: 'Decision', connections: [edge('Y', 'Yes'), edge('N', 'No')] }),
    step('Y', { step_name: 'Approve' }),
    step('N', { step_name: 'Reject' }),
  ]

  it('places both branch targets in a later column than the decision', () => {
    const g = generateSwimlane(steps, 'LR')
    const col = Object.fromEntries(g.nodes.map((n) => [n.step_id, n.col]))
    expect(col.Y).toBeGreaterThan(col.D1)
    expect(col.N).toBeGreaterThan(col.D1)
  })

  it('labels both decision edges', () => {
    const g = generateSwimlane(steps, 'LR')
    const branchLabels = g.edges
      .filter((e) => e.from === 'D1')
      .map((e) => e.label)
      .sort()
    expect(branchLabels).toEqual(['No', 'Yes'])
  })

  it('gives each branch edge a label anchor point', () => {
    const g = generateSwimlane(steps, 'LR')
    const yes = g.edges.find((e) => e.label === 'Yes')
    expect(Number.isFinite(yes.labelX)).toBe(true)
    expect(Number.isFinite(yes.labelY)).toBe(true)
  })
})

describe('generateSwimlane — TC3.3 multi-lane', () => {
  const steps = [
    step('S1', { lane_role: 'Sales', connections: [edge('S2')] }),
    step('S2', { lane_role: 'Warehouse', connections: [edge('S3')] }),
    step('S3', { lane_role: 'Accounts' }),
  ]

  it('produces three lane bands, one per distinct role', () => {
    const g = generateSwimlane(steps, 'LR')
    expect(g.lanes.map((l) => l.role)).toEqual(['Sales', 'Warehouse', 'Accounts'])
  })

  it('places each node into its role band', () => {
    const g = generateSwimlane(steps, 'LR')
    const lane = Object.fromEntries(g.nodes.map((n) => [n.step_id, n.laneIndex]))
    expect(lane.S1).toBe(0)
    expect(lane.S2).toBe(1)
    expect(lane.S3).toBe(2)
  })

  it('orders lanes by Lane Role sort_order when supplied', () => {
    const g = generateSwimlane(steps, 'LR', {
      laneOrder: { Sales: 30, Warehouse: 10, Accounts: 20 },
    })
    expect(g.lanes.map((l) => l.role)).toEqual(['Warehouse', 'Accounts', 'Sales'])
  })
})

describe('generateSwimlane — TC3.4 cycles terminate', () => {
  const steps = [
    step('S1', { connections: [edge('S2')] }),
    step('S2', { connections: [edge('S3')] }),
    step('S3', { connections: [edge('S1', 'loop')] }), // back edge
  ]

  it('terminates and still ranks nodes into ascending columns', () => {
    const g = generateSwimlane(steps, 'LR')
    const col = Object.fromEntries(g.nodes.map((n) => [n.step_id, n.col]))
    expect([col.S1, col.S2, col.S3]).toEqual([0, 1, 2])
  })

  it('still draws the cycle-closing edge', () => {
    const g = generateSwimlane(steps, 'LR')
    const loop = g.edges.find((e) => e.from === 'S3' && e.to === 'S1')
    expect(loop).toBeTruthy()
    expect(loop.label).toBe('loop')
  })

  it('handles a self-loop without hanging', () => {
    const selfLoop = [step('A', { connections: [edge('A', 'again')] })]
    const g = generateSwimlane(selfLoop, 'LR')
    expect(g.nodes).toHaveLength(1)
    expect(g.edges).toHaveLength(1)
  })
})

describe('generateSwimlane — no-overlap placement', () => {
  it('fans unconnected same-lane nodes across columns instead of stacking', () => {
    const steps = ['S1', 'S2', 'S3'].map((id) => step(id, { lane_role: 'Ops' }))
    const g = generateSwimlane(steps, 'LR')
    const cols = g.nodes.map((n) => n.col).sort()
    expect(cols).toEqual([0, 1, 2]) // distinct columns, no shared cell
    const xs = new Set(g.nodes.map((n) => n.x))
    expect(xs.size).toBe(3) // no two nodes share a position
  })

  it('never lets two same-lane nodes share a (col, lane) cell', () => {
    const steps = [
      step('S1', { lane_role: 'Sales', connections: [edge('D1')] }),
      step('D1', { lane_role: 'Sales', node_type: 'Decision', connections: [edge('Y', 'Yes'), edge('N', 'No')] }),
      step('Y', { lane_role: 'Sales' }),
      step('N', { lane_role: 'Sales' }),
    ]
    const g = generateSwimlane(steps, 'LR')
    const cells = g.nodes.map((n) => `${n.laneIndex}:${n.col}`)
    expect(new Set(cells).size).toBe(cells.length)
  })

  it('keeps cross-lane nodes free to align on the same column', () => {
    const steps = [
      step('A', { lane_role: 'Sales', connections: [edge('B')] }),
      step('B', { lane_role: 'Ops' }),
    ]
    const g = generateSwimlane(steps, 'LR')
    const a = g.nodes.find((n) => n.step_id === 'A')
    const b = g.nodes.find((n) => n.step_id === 'B')
    expect(b.col).toBe(a.col + 1)
    expect(a.laneIndex).not.toBe(b.laneIndex)
  })
})

describe('generateSwimlane — direction + overrides', () => {
  const steps = [
    step('S1', { connections: [edge('S2')] }),
    step('S2', {}),
  ]

  it('flows along X for LR and along Y for TB (TC3.6)', () => {
    const lr = generateSwimlane(steps, 'LR')
    const tb = generateSwimlane(steps, 'TB')
    const lrNodes = Object.fromEntries(lr.nodes.map((n) => [n.step_id, n]))
    const tbNodes = Object.fromEntries(tb.nodes.map((n) => [n.step_id, n]))
    expect(lrNodes.S2.x).toBeGreaterThan(lrNodes.S1.x)
    expect(lrNodes.S1.y).toBe(lrNodes.S2.y)
    expect(tbNodes.S2.y).toBeGreaterThan(tbNodes.S1.y)
    expect(tbNodes.S1.x).toBe(tbNodes.S2.x)
  })

  it('honours manual_x / manual_y overrides (TC3.7)', () => {
    const dragged = [
      step('S1', { manual_x: 500, manual_y: 320, connections: [edge('S2')] }),
      step('S2', {}),
    ]
    const g = generateSwimlane(dragged, 'LR')
    const s1 = g.nodes.find((n) => n.step_id === 'S1')
    expect(s1.x).toBe(500)
    expect(s1.y).toBe(320)
  })

  // Regression: a Map Step that has never been dragged still round-trips
  // manual_x/manual_y as 0/0 (the Frappe Float column is NOT NULL DEFAULT 0,
  // so an unset value can never persist as true null). Before this fix every
  // never-dragged step collapsed onto the literal (0, 0) origin on load,
  // forcing a manual "Auto-arrange" click every time to see a usable diagram.
  it('treats manual_x=0/manual_y=0 as unset, not a real override, on fresh load', () => {
    const steps = [
      step('S1', { lane_role: 'Ops', manual_x: 0, manual_y: 0 }),
      step('S2', { lane_role: 'Ops', manual_x: 0, manual_y: 0 }),
      step('S3', { lane_role: 'Ops', manual_x: 0, manual_y: 0 }),
    ]
    const g = generateSwimlane(steps, 'LR')
    const positions = g.nodes.map((n) => `${n.x},${n.y}`)
    expect(new Set(positions).size).toBe(3) // fanned out, not stacked at 0,0
    g.nodes.forEach((n) => {
      expect(n.x === 0 && n.y === 0).toBe(false)
    })
  })

  // A genuine drag that only zeroes ONE axis is still a real, intentional
  // override and must be respected — only the never-touched (0, 0) PAIR is
  // treated as the "unset" sentinel.
  it('still honours a manual override that legitimately zeroes a single axis', () => {
    const steps = [step('S1', { manual_x: 0, manual_y: 320, connections: [edge('S2')] }), step('S2', {})]
    const g = generateSwimlane(steps, 'LR')
    const s1 = g.nodes.find((n) => n.step_id === 'S1')
    expect(s1.x).toBe(0)
    expect(s1.y).toBe(320)
  })

  it('drops edges that point outside the map', () => {
    const g = generateSwimlane([step('S1', { connections: [edge('ghost')] })], 'LR')
    expect(g.edges).toHaveLength(0)
  })

  it('returns empty geometry for no steps', () => {
    const g = generateSwimlane([], 'LR')
    expect(g.nodes).toEqual([])
    expect(g.lanes).toEqual([])
    expect(g.edges).toEqual([])
  })
})
