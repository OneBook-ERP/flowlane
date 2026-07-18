// Pure table -> swimlane generation engine (PLAN §10). Deterministic and
// browser-free so it is unit-testable (vitest, node env). Given the map's steps
// and a flow direction it computes lane bands, node placement (longest-path
// layering across columns x lanes) and orthogonal edge routing. No Vue, no DOM.
//
// Node identity: each step is keyed by `step_id`; connections reference a target
// via `to_step_id`. The Diagram tab maps the store's uid-based rows onto this
// contract before calling (uid -> step_id), see DiagramTab.vue.
//
// Input:
//   steps: [{ step_id, lane_role, node_type, shape, manual_x?, manual_y?,
//             label?, connections: [{ to_step_id, label, condition? }] }]
//   direction: 'TB' | 'LR'
//   options: { laneOrder?: { [role]: number } }  // Lane Role.sort_order lookup
// Output:
//   { lanes:[{role,index,pos,size,length,labelX,labelY}],
//     nodes:[{step_id,label,col,laneIndex,x,y,w,h,shape,role}],
//     edges:[{from,to,label,points:[{x,y}],labelX,labelY}],
//     width, height, direction }

const NODE_W = 150
const NODE_H = 58
const COL_GAP = 220 // centre-to-centre spacing along the flow axis
const LANE_SIZE = 130 // cross-axis thickness of one lane band
const MARGIN = 40
const LABEL_GUTTER = 140 // reserved at the FLOW start for lane role labels
const SIBLING_OFFSET = 16 // nudge overlapping parallel edges apart

const DEFAULT_SHAPES = {
  'Start/End': 'Terminator',
  'Process/Task': 'Rectangle',
  Decision: 'Diamond',
  'Input/Output': 'Parallelogram',
  Junction: 'Circle',
}

export function generateSwimlane(steps, direction = 'TB', options = {}) {
  const dir = direction === 'LR' ? 'LR' : 'TB'
  const nodes = normalizeSteps(steps)
  const nodeIds = nodes.map((n) => n.step_id)
  const idSet = new Set(nodeIds)
  const edges = collectEdges(nodes, idSet)

  const lanes = orderLanes(nodes, options.laneOrder || {})
  const laneIndex = new Map(lanes.map((lane) => [lane.role, lane.index]))
  const ranks = computeColumns(nodeIds, edges)
  const columns = spreadWithinLanes(nodes, ranks, laneIndex)

  const placed = placeNodes(nodes, columns, laneIndex, dir)
  const geometry = layoutBands(lanes, placed, columns, dir)
  const routed = routeEdges(edges, placed, dir)

  return {
    lanes: geometry.lanes,
    nodes: placed,
    edges: routed,
    width: geometry.width,
    height: geometry.height,
    labelGutter: LABEL_GUTTER, // flow-start strip that holds the lane labels
    direction: dir,
  }
}

// --- normalisation --------------------------------------------------------

function normalizeSteps(steps) {
  return (steps || [])
    .filter((step) => step && step.step_id !== undefined && step.step_id !== null)
    .map((step) => ({
      step_id: String(step.step_id),
      label: step.label || step.step_name || String(step.step_id),
      role: step.lane_role || '',
      node_type: step.node_type || '',
      shape: resolveShape(step),
      manual_x: numberOrNull(step.manual_x),
      manual_y: numberOrNull(step.manual_y),
      connections: step.connections || [],
    }))
}

function resolveShape(step) {
  if (step.shape) return step.shape
  return DEFAULT_SHAPES[step.node_type] || 'Rectangle'
}

function collectEdges(nodes, idSet) {
  const edges = []
  nodes.forEach((node) => {
    node.connections.forEach((conn) => {
      const to = conn.to_step_id
      if (to === undefined || to === null || to === '') return
      const target = String(to)
      if (!idSet.has(target)) return // drop edges pointing outside the map
      edges.push({ from: node.step_id, to: target, label: conn.label || '' })
    })
  })
  return edges
}

// --- lanes ----------------------------------------------------------------

function orderLanes(nodes, laneOrder) {
  const seen = new Map()
  nodes.forEach((node, index) => {
    if (!seen.has(node.role)) seen.set(node.role, index)
  })
  const roles = [...seen.keys()].sort((a, b) => {
    const sa = sortKey(laneOrder, a)
    const sb = sortKey(laneOrder, b)
    if (sa !== sb) return sa - sb
    return seen.get(a) - seen.get(b) // stable: first-appearance tie-break
  })
  return roles.map((role, index) => ({ role, index }))
}

function sortKey(laneOrder, role) {
  const value = laneOrder[role]
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

// --- columns: longest-path layering (cycles broken by first-seen order) ----

function computeColumns(nodeIds, edges) {
  const adjacency = buildAdjacency(nodeIds, edges)
  const backEdges = findBackEdges(nodeIds, adjacency)
  return longestPathRanks(nodeIds, adjacency, backEdges)
}

// Two nodes in the same lane must not share a column, or they render on top of
// each other. Keep each node's rank as its preferred column; when a lane already
// occupies that column, push the later node (by rank, then first-seen order) to
// the next free one. With no edges every node ranks 0, so a lane's nodes fan out
// 0,1,2,… along the flow axis in row order instead of stacking at the start.
function spreadWithinLanes(nodes, ranks, laneIndex) {
  const ordered = nodes
    .map((node, seen) => ({
      id: node.step_id,
      lane: laneIndex.get(node.role) || 0,
      col: ranks.get(node.step_id) || 0,
      seen,
    }))
    .sort((a, b) => a.col - b.col || a.seen - b.seen)

  const usedByLane = new Map()
  const columns = new Map()
  ordered.forEach((item) => {
    const used = usedByLane.get(item.lane) || new Set()
    let col = item.col
    while (used.has(col)) col += 1
    used.add(col)
    usedByLane.set(item.lane, used)
    columns.set(item.id, col)
  })
  return columns
}

function buildAdjacency(nodeIds, edges) {
  const adjacency = new Map(nodeIds.map((id) => [id, []]))
  edges.forEach((edge) => adjacency.get(edge.from).push(edge.to))
  return adjacency
}

// DFS colouring (white/grey/black) in first-seen order; an edge to a grey (on
// the current stack) node closes a cycle and is excluded from layering so the
// rank pass always terminates. The edge itself is still drawn.
function findBackEdges(nodeIds, adjacency) {
  const WHITE = 0
  const GREY = 1
  const BLACK = 2
  const color = new Map(nodeIds.map((id) => [id, WHITE]))
  const back = new Set()

  for (const root of nodeIds) {
    if (color.get(root) !== WHITE) continue
    const stack = [{ node: root, i: 0 }]
    color.set(root, GREY)
    while (stack.length) {
      const frame = stack[stack.length - 1]
      const neighbors = adjacency.get(frame.node)
      if (frame.i >= neighbors.length) {
        color.set(frame.node, BLACK)
        stack.pop()
        continue
      }
      const next = neighbors[frame.i++]
      const state = color.get(next)
      if (state === GREY) {
        back.add(edgeKey(frame.node, next)) // cycle-closing edge
      } else if (state === WHITE) {
        color.set(next, GREY)
        stack.push({ node: next, i: 0 })
      }
    }
  }
  return back
}

// Longest path from any source over the acyclic (forward) edges = column index.
function longestPathRanks(nodeIds, adjacency, backEdges) {
  const forward = forwardEdges(nodeIds, adjacency, backEdges)
  const order = topoOrder(nodeIds, forward)
  const rank = new Map(nodeIds.map((id) => [id, 0]))
  order.forEach((node) => {
    forward.get(node).forEach((to) => {
      if (rank.get(to) < rank.get(node) + 1) rank.set(to, rank.get(node) + 1)
    })
  })
  return rank
}

function forwardEdges(nodeIds, adjacency, backEdges) {
  const forward = new Map(nodeIds.map((id) => [id, []]))
  nodeIds.forEach((from) => {
    adjacency.get(from).forEach((to) => {
      if (!backEdges.has(edgeKey(from, to))) forward.get(from).push(to)
    })
  })
  return forward
}

// Kahn topological sort over the forward DAG; first-seen order breaks ties so
// the layout is deterministic.
function topoOrder(nodeIds, forward) {
  const indegree = new Map(nodeIds.map((id) => [id, 0]))
  nodeIds.forEach((from) => forward.get(from).forEach((to) => indegree.set(to, indegree.get(to) + 1)))

  const queue = nodeIds.filter((id) => indegree.get(id) === 0)
  const order = []
  while (queue.length) {
    const node = queue.shift()
    order.push(node)
    forward.get(node).forEach((to) => {
      indegree.set(to, indegree.get(to) - 1)
      if (indegree.get(to) === 0) queue.push(to)
    })
  }
  // Any node left with indegree>0 sat on a broken cycle; append in first-seen order.
  nodeIds.forEach((id) => {
    if (!order.includes(id)) order.push(id)
  })
  return order
}

// --- placement ------------------------------------------------------------

function placeNodes(nodes, columns, laneIndex, dir) {
  return nodes.map((node) => {
    const col = columns.get(node.step_id) || 0
    const lane = laneIndex.get(node.role) || 0
    const auto = cellCenter(col, lane, dir)
    const manual = hasManualOverride(node)
    return {
      step_id: node.step_id,
      label: node.label,
      role: node.role,
      shape: node.shape,
      node_type: node.node_type,
      col,
      laneIndex: lane,
      x: manual ? node.manual_x : auto.x,
      y: manual ? node.manual_y : auto.y,
      w: NODE_W,
      h: NODE_H,
    }
  })
}

// A step that has never been dragged still round-trips manual_x/manual_y as
// 0/0, not null: the backing Map Step field is a Frappe Float, and Frappe's
// schema generator makes Float columns NOT NULL DEFAULT 0 (see
// frappe/database/schema.py NOT_NULL_TYPES) — an unset value can never persist
// as true NULL, so every "never touched" row loads back as (0, 0). Treating
// that as a real override collapses every untouched node onto one point, which
// is exactly what forced a manual "Auto-arrange" click on every load. Every
// auto-computed position already sits past MARGIN/LABEL_GUTTER, so a genuine
// drag essentially never lands a node at the literal (0, 0) origin — treat
// that exact pair as "unset" and fall back to the computed layout instead.
function hasManualOverride(node) {
  if (node.manual_x === null || node.manual_y === null) return false
  if (node.manual_x === 0 && node.manual_y === 0) return false
  return true
}

// Centre of the (column, lane) cell. The flow axis carries the columns and starts
// after LABEL_GUTTER so lane labels have room; the cross axis carries the lanes.
// TB: columns run down (y), lanes across (x). LR: columns run right (x), lanes
// down (y).
function cellCenter(col, lane, dir) {
  const half = dir === 'TB' ? NODE_H / 2 : NODE_W / 2
  const flow = LABEL_GUTTER + half + col * COL_GAP
  const cross = MARGIN + lane * LANE_SIZE + LANE_SIZE / 2
  return dir === 'TB' ? { x: cross, y: flow } : { x: flow, y: cross }
}

function layoutBands(lanes, placed, columns, dir) {
  const maxCol = maxValue(columns)
  const flowSpan = LABEL_GUTTER + NODE_W + maxCol * COL_GAP + MARGIN
  const crossSpan = MARGIN * 2 + lanes.length * LANE_SIZE

  const bands = lanes.map((lane) => {
    const pos = MARGIN + lane.index * LANE_SIZE
    const label = laneLabel(pos, dir)
    return {
      role: lane.role,
      index: lane.index,
      pos, // cross-axis start of the band
      size: LANE_SIZE,
      length: flowSpan, // flow-axis extent of the band
      labelX: label.x,
      labelY: label.y,
    }
  })

  // Grow the canvas if a dragged node sits past the computed bounds.
  const base = dir === 'TB'
    ? { width: crossSpan, height: flowSpan }
    : { width: flowSpan, height: crossSpan }
  return { lanes: bands, ...expandToNodes(base, placed) }
}

// Lane label rides the FLOW start: the top strip for TB (centred over the band),
// the left strip for LR (left-aligned within the gutter).
function laneLabel(pos, dir) {
  const center = pos + LANE_SIZE / 2
  return dir === 'TB' ? { x: center, y: LABEL_GUTTER / 2 } : { x: 12, y: center }
}

function expandToNodes(size, placed) {
  let width = size.width
  let height = size.height
  placed.forEach((node) => {
    width = Math.max(width, node.x + node.w / 2 + MARGIN)
    height = Math.max(height, node.y + node.h / 2 + MARGIN)
  })
  return { width, height }
}

// --- edge routing (orthogonal elbows) -------------------------------------

function routeEdges(edges, placed, dir) {
  const byNode = new Map(placed.map((node) => [node.step_id, node]))
  const offsets = siblingOffsets(edges)
  return edges
    .map((edge) => routeEdge(edge, byNode, offsets, dir))
    .filter(Boolean)
}

function routeEdge(edge, byNode, offsets, dir) {
  const from = byNode.get(edge.from)
  const to = byNode.get(edge.to)
  if (!from || !to) return null
  const offset = offsets.get(edgeKey(edge.from, edge.to)) || 0
  const points = elbow(from, to, dir, offset)
  const mid = points[Math.floor(points.length / 2) - 1]
  const next = points[Math.floor(points.length / 2)]
  return {
    from: edge.from,
    to: edge.to,
    label: edge.label,
    points,
    labelX: (mid.x + next.x) / 2,
    labelY: (mid.y + next.y) / 2,
  }
}

// Orthogonal 4-point elbow between two node borders along the flow axis. The
// `offset` slides the elbow so parallel sibling edges do not overlap.
function elbow(from, to, dir, offset) {
  if (dir === 'TB') {
    const startY = from.y + from.h / 2
    const endY = to.y - to.h / 2
    const midY = (startY + endY) / 2 + offset
    return [
      { x: from.x, y: startY },
      { x: from.x, y: midY },
      { x: to.x, y: midY },
      { x: to.x, y: endY },
    ]
  }
  const startX = from.x + from.w / 2
  const endX = to.x - to.w / 2
  const midX = (startX + endX) / 2 + offset
  return [
    { x: startX, y: from.y },
    { x: midX, y: from.y },
    { x: midX, y: to.y },
    { x: endX, y: to.y },
  ]
}

// Fan parallel edges leaving the same source apart by a small offset each.
function siblingOffsets(edges) {
  const counts = new Map()
  const offsets = new Map()
  edges.forEach((edge) => {
    const bucket = edge.from
    const n = counts.get(bucket) || 0
    counts.set(bucket, n + 1)
    if (n > 0) offsets.set(edgeKey(edge.from, edge.to), n * SIBLING_OFFSET)
  })
  return offsets
}

// --- small utilities ------------------------------------------------------

function edgeKey(from, to) {
  return `${from} ${to}`
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null
}

function maxValue(map) {
  let max = 0
  map.forEach((value) => {
    if (value > max) max = value
  })
  return max
}
