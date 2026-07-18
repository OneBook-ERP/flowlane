// Node-type color — the single source of truth for the hue of each Node Type
// (UI-REVAMP §3: "one consistent hue per node type, reused in Table, Diagram and
// inspector"). Keyed by Node Type NAME, the SAME vocabulary the shape source uses
// (`diagramMeta.nodeShapeMap()` / setup.py seeds), so shape and color never drift
// apart. The backend Node Type DocType carries only `shape`; color is a frontend
// design decision, so it lives here as an additive companion to nodeShapes.js.
//
// `dot` is a frappe-ui palette class (used in chrome today — the Table node-type
// dot, D6); `hex` is the matching token value, ready for SVG fills when the Diagram
// adopts color in a later UI step. Pure + unit-tested.

const NODE_TYPE_COLORS = {
  'Start/End': { dot: 'bg-green-500', hex: '#43ac79' }, // Terminator
  'Process/Task': { dot: 'bg-blue-500', hex: '#0d8ef8' }, // Rectangle
  Decision: { dot: 'bg-amber-500', hex: '#df9311' }, // Diamond
  'Input/Output': { dot: 'bg-violet-500', hex: '#7757ee' }, // Parallelogram
  Junction: { dot: 'bg-gray-400', hex: '#c7c7c7' }, // Circle
}

// Neutral fallback for an empty/unknown node type (a not-yet-classified row).
const FALLBACK = { dot: 'bg-gray-300', hex: '#e2e2e2' }

export function nodeTypeColor(nodeType) {
  return NODE_TYPE_COLORS[nodeType] || FALLBACK
}

export const NODE_TYPE_NAMES = Object.keys(NODE_TYPE_COLORS)
