import { describe, it, expect } from 'vitest'
import { findMapContext, findProcessForSub, breadcrumbTrail, crumbLabel } from './treeContext.js'

function tree() {
  return [
    {
      name: 'PROC-1',
      process_name: 'Order to Cash',
      sub_processes: [
        {
          name: 'SUB-1',
          title: 'Order Capture',
          maps: [
            { name: 'MAP-1', map_title: 'Order Capture — As-Is', map_type: 'As-Is' },
          ],
        },
        { name: 'SUB-2', title: 'Fulfillment', maps: [] },
      ],
    },
    { name: 'PROC-2', process_name: 'Procure to Pay', sub_processes: [] },
  ]
}

describe('findMapContext', () => {
  it('finds the process/sub/map ancestry for a map name', () => {
    const ctx = findMapContext(tree(), 'MAP-1')
    expect(ctx.process.name).toBe('PROC-1')
    expect(ctx.sub.name).toBe('SUB-1')
    expect(ctx.map.name).toBe('MAP-1')
  })

  it('returns null for an unknown map (e.g. tree still loading)', () => {
    expect(findMapContext(tree(), 'MAP-404')).toBeNull()
  })

  it('returns null for an empty/undefined tree', () => {
    expect(findMapContext(undefined, 'MAP-1')).toBeNull()
  })
})

describe('findProcessForSub', () => {
  it('finds the owning process for a sub-process name', () => {
    expect(findProcessForSub(tree(), 'SUB-2').name).toBe('PROC-1')
  })

  it('returns undefined when the sub-process is not in the tree', () => {
    expect(findProcessForSub(tree(), 'SUB-404')).toBeUndefined()
  })
})

describe('breadcrumbTrail', () => {
  it('builds the full process/sub/map trail when a map is active', () => {
    const trail = breadcrumbTrail(tree(), { mapName: 'MAP-1' })
    expect(trail.map((c) => c.level)).toEqual(['process', 'sub', 'map'])
    expect(trail.map(crumbLabel)).toEqual([
      'Order to Cash',
      'Order Capture',
      'Order Capture — As-Is',
    ])
  })

  it('falls back to the selected sub-process when no map is active', () => {
    const trail = breadcrumbTrail(tree(), {
      selected: { level: 'sub', node: tree()[0].sub_processes[1] },
    })
    expect(trail.map(crumbLabel)).toEqual(['Order to Cash', 'Fulfillment'])
  })

  it('shows just the process when a process is selected', () => {
    const trail = breadcrumbTrail(tree(), {
      selected: { level: 'process', node: tree()[1] },
    })
    expect(trail.map(crumbLabel)).toEqual(['Procure to Pay'])
  })

  it('an active map wins over a stale selected node', () => {
    const trail = breadcrumbTrail(tree(), {
      mapName: 'MAP-1',
      selected: { level: 'process', node: tree()[1] },
    })
    expect(trail.map(crumbLabel)).toEqual([
      'Order to Cash',
      'Order Capture',
      'Order Capture — As-Is',
    ])
  })

  it('returns an empty trail when nothing is active or selected', () => {
    expect(breadcrumbTrail(tree(), {})).toEqual([])
  })

  it('returns an empty trail for a map not present in the tree', () => {
    expect(breadcrumbTrail(tree(), { mapName: 'MAP-404' })).toEqual([])
  })
})
