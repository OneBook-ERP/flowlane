// Which lane band a dropped node's cross-axis coordinate falls into (pure, no
// Vue/DOM). Dragging a node in the Diagram tab only ever wrote manual_x/
// manual_y (position), never lane_role, so dropping a node into a different
// lane's band moved it visually but left it assigned to its old lane — the
// next auto-arrange (or a fresh load) would snap it right back. This is what
// DiagramTab.vue's commitDrag() calls to also update lane_role on drop.
//
// `lanes` is generateSwimlane's own `lanes` output: [{ role, pos, size, … }].
// `cross` is the node's cross-axis coordinate at drop time — x for TB
// (lanes run left-to-right), y for LR (lanes run top-to-bottom); see
// generateSwimlane.js's cellCenter() for the same axis convention.
export function laneAtCross(lanes, cross) {
  if (!lanes || !lanes.length) return null
  const hit = lanes.find((lane) => cross >= lane.pos && cross < lane.pos + lane.size)
  if (hit) return hit.role
  // A drop just past the first/last band edge (e.g. dragged slightly beyond
  // the canvas margin) still clearly means "that" lane, not "no lane".
  return cross < lanes[0].pos ? lanes[0].role : lanes[lanes.length - 1].role
}
