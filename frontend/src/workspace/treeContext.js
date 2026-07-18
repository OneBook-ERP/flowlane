// Pure helpers that turn the nested client tree (data/tree.js's
// `get_client_tree` shape) plus "what's active" into breadcrumb/context data
// for the workspace shell (UI step U2, B2/B4). No Vue, no network — mirrors
// data/reorder.js's pure-logic pattern so it can be unit-tested directly.

// Find the {process, sub, map} ancestry for a given map name. Returns null if
// the map isn't in this tree (e.g. tree still loading, or map from another
// client reached via a stale deep link).
export function findMapContext(processes, mapName) {
  for (const process of processes || []) {
    for (const sub of process.sub_processes || []) {
      const map = (sub.maps || []).find((m) => m.name === mapName)
      if (map) return { process, sub, map }
    }
  }
  return null
}

// Find the parent process for a given sub-process name.
export function findProcessForSub(processes, subName) {
  return (processes || []).find((p) => (p.sub_processes || []).some((s) => s.name === subName))
}

// Build the breadcrumb trail (array of {level, node}) for the top bar. An
// active map wins over a merely-selected tree node, matching the shell's
// display priority (an open map always shows its full ancestry).
export function breadcrumbTrail(processes, { mapName, selected } = {}) {
  if (mapName) {
    const ctx = findMapContext(processes, mapName)
    if (!ctx) return []
    return [
      { level: 'process', node: ctx.process },
      { level: 'sub', node: ctx.sub },
      { level: 'map', node: ctx.map },
    ]
  }
  if (!selected) return []
  if (selected.level === 'sub') {
    const process = findProcessForSub(processes, selected.node.name)
    const trail = []
    if (process) trail.push({ level: 'process', node: process })
    trail.push({ level: 'sub', node: selected.node })
    return trail
  }
  if (selected.level === 'process') {
    return [{ level: 'process', node: selected.node }]
  }
  return []
}

// Crumb display label, in one place so the top bar stays presentation-only.
export function crumbLabel(crumb) {
  if (crumb.level === 'process') return crumb.node.process_name
  if (crumb.level === 'sub') return crumb.node.title
  return crumb.node.map_title
}
