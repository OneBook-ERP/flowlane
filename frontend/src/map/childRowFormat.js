// Shared text encoding for Connections and Pain Points — Map Step child
// tables that don't fit a single scalar spreadsheet/paste cell. Used by BOTH
// map/excelIO.js (Upload/Download Excel) and map/pasteParser.js (Paste from
// AI): the two import paths accept the exact same "Connections"/"Pain
// Points" column format, so one consultant-facing convention serves both,
// and an AI reply formatted for one works for the other. Pure — no Vue, no
// network — decode output feeds map/excelImport.js's upsert, which resolves
// `to_step_id` references to real `to_uid` edges once every imported row's
// step_id is known.
export const ITEM_SEP = ' | '

const SEVERITIES = ['Low', 'Medium', 'High']

// One connection per token: "<target step_id> (Label) [Condition]" — Label
// and Condition are omitted when blank. Multiple connections join with
// ITEM_SEP. A connection whose target step has no step_id (shouldn't
// normally happen) is dropped rather than exported as a blank,
// unresolvable reference.
export function encodeConnections(connections = [], stepIdByUid) {
  return connections
    .map((conn) => {
      const target = stepIdByUid.get(conn.to_uid) || ''
      if (!target) return ''
      let text = target
      if (conn.label) text += ` (${conn.label})`
      if (conn.condition) text += ` [${conn.condition}]`
      return text
    })
    .filter(Boolean)
    .join(ITEM_SEP)
}

// Returns [{ to_step_id, label, condition }] — target is by step_id, not
// uid, since the caller (a fresh import) has no uids yet.
export function decodeConnections(cell) {
  const text = String(cell ?? '').trim()
  if (!text) return []
  return text
    .split(ITEM_SEP)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(\S+)(?:\s*\(([^)]*)\))?(?:\s*\[([^\]]*)\])?/)
      if (!match) return null
      return { to_step_id: match[1], label: (match[2] || '').trim(), condition: (match[3] || '').trim() }
    })
    .filter(Boolean)
}

// One pain point per token: "<Severity>: <description> (<Type>)" — Type is
// omitted when blank, Severity defaults to Low if missing/unrecognised (same
// default the Pain Point store mutator uses). Multiple points join with
// ITEM_SEP. Points with no description are dropped (nothing to import).
export function encodePainPoints(points = []) {
  return points
    .filter((point) => point.description)
    .map((point) => {
      const severity = SEVERITIES.includes(point.severity) ? point.severity : 'Low'
      let text = `${severity}: ${point.description}`
      if (point.pain_type) text += ` (${point.pain_type})`
      return text
    })
    .join(ITEM_SEP)
}

export function decodePainPoints(cell) {
  const text = String(cell ?? '').trim()
  if (!text) return []
  return text
    .split(ITEM_SEP)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(?:(low|medium|high)\s*:\s*)?(.*?)(?:\s*\(([^)]*)\))?$/i)
      const severity = match?.[1] ? capitalize(match[1]) : 'Low'
      const description = (match?.[2] ?? token).trim()
      const pain_type = (match?.[3] || '').trim()
      return { description, pain_type, severity }
    })
    .filter((point) => point.description)
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}
