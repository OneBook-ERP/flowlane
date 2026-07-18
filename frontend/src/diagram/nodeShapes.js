// Pure SVG geometry per Node Type shape (PLAN §5). A placed node carries a CENTRE
// (x, y) plus w/h; each builder returns a small descriptor the Diagram tab renders
// as the matching SVG primitive. Browser-free and unit-tested.

// `kind` tells the template which SVG element to draw; the rest are its attributes.
export function shapeGeometry(node) {
  const left = node.x - node.w / 2
  const top = node.y - node.h / 2
  switch (node.shape) {
    case 'Terminator':
      return { kind: 'rect', x: left, y: top, width: node.w, height: node.h, rx: node.h / 2 }
    case 'Diamond':
      return { kind: 'polygon', points: diamond(node) }
    case 'Parallelogram':
      return { kind: 'polygon', points: parallelogram(node, node.h * 0.35) }
    case 'Circle':
      return { kind: 'ellipse', cx: node.x, cy: node.y, rx: node.w / 2, ry: node.h / 2 }
    case 'Rectangle':
    default:
      return { kind: 'rect', x: left, y: top, width: node.w, height: node.h, rx: 6 }
  }
}

// Turn a polygon point list into the SVG `points` attribute string.
export function pointsAttr(points) {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ')
}

function diamond(node) {
  return [
    { x: node.x, y: node.y - node.h / 2 },
    { x: node.x + node.w / 2, y: node.y },
    { x: node.x, y: node.y + node.h / 2 },
    { x: node.x - node.w / 2, y: node.y },
  ]
}

function parallelogram(node, skew) {
  const left = node.x - node.w / 2
  const right = node.x + node.w / 2
  const top = node.y - node.h / 2
  const bottom = node.y + node.h / 2
  return [
    { x: left + skew, y: top },
    { x: right, y: top },
    { x: right - skew, y: bottom },
    { x: left, y: bottom },
  ]
}

function round(value) {
  return Math.round(value * 100) / 100
}
