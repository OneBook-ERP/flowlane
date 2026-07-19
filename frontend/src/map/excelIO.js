// Pure Map Step <-> spreadsheet-rows conversion (T3.2/T3.3). No Vue, no DOM, no
// `xlsx` import — this is the part of Excel import/export that is worth unit
// testing without a real .xlsx file; excelFile.js wraps it with the actual
// SheetJS calls and is the thin, untested browser-glue layer (same split as
// diagram/pdf.js vs diagram/exportDiagram.js).
//
// Export writes ALL 15 Map Step fields (COLUMNS) PLUS Connections and Pain
// Points (BUG FIX: these two child tables were missing from the template
// entirely, so downloading a map, editing it, and re-uploading silently lost
// every connection and pain point). Both are child-table data, not a single
// scalar cell, so they round-trip through a small delimited text format in
// one cell each (see encodeConnections/encodePainPoints below) — good enough
// for a consultant to read and hand-edit in Excel, not a bulletproof
// serialization. Import-side upsert (matching rows back onto existing steps
// instead of always appending) lives in map/excelImport.js, since it needs
// the live store's steps, not just row<->field conversion.

import { COLUMNS } from '@/components/editor/columns.js'

const CONNECTIONS_LABEL = 'Connections'
const PAIN_POINTS_LABEL = 'Pain Points'
const ITEM_SEP = ' | '
const SEVERITIES = ['Low', 'Medium', 'High']

// [header row, ...data rows] as arrays, ready for XLSX.utils.aoa_to_sheet.
export function stepsToSheetRows(steps) {
  const stepIdByUid = new Map(steps.map((step) => [step.uid, step.step_id || '']))
  const header = [...COLUMNS.map((column) => column.label), CONNECTIONS_LABEL, PAIN_POINTS_LABEL]
  const body = steps.map((step) => [
    ...COLUMNS.map((column) => step[column.field] ?? ''),
    encodeConnections(step.connections, stepIdByUid),
    encodePainPoints(step.pain_points),
  ])
  return [header, ...body]
}

// Inverse: array-of-arrays (first row = header) -> one { field: value } map per
// non-blank row, the same shape parseClipboard() produces for Paste-from-AI,
// ready for store.importRows/addRows. Header cells are matched to COLUMNS by
// label so a re-ordered or trimmed-down file (e.g. a consultant deleted a
// column) still lands on the right field; a header cell that matches nothing
// known falls back to its position so a plain, header-less AI-generated block
// still imports. Connections/Pain Points, if present, decode onto `.connections`
// / `.pain_points` on the returned map (absent entirely when the file has no
// such column, e.g. an older export or a hand-written block) — `.connections`
// entries carry `to_step_id`, not `to_uid`: resolving that to a real row
// happens in excelImport.js, once every imported row's step_id is known.
export function sheetRowsToFieldMaps(sheetRows) {
  if (!sheetRows.length) return []
  const [header, ...body] = sheetRows
  const fields = header.map((label, index) => labelToField(label) || COLUMNS[index]?.field)
  const connIndex = header.findIndex((label) => String(label).trim() === CONNECTIONS_LABEL)
  const painIndex = header.findIndex((label) => String(label).trim() === PAIN_POINTS_LABEL)
  return body.filter(hasAnyValue).map((row) => {
    const values = rowToFieldMap(row, fields)
    if (connIndex !== -1) values.connections = decodeConnections(row[connIndex])
    if (painIndex !== -1) values.pain_points = decodePainPoints(row[painIndex])
    return values
  })
}

// One connection per token: "<target step_id> (Label) [Condition]" — Label and
// Condition are omitted when blank. Multiple connections join with ITEM_SEP.
// A connection whose target step has no step_id (shouldn't normally happen)
// is dropped rather than exported as a blank, unresolvable reference.
function encodeConnections(connections = [], stepIdByUid) {
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

function decodeConnections(cell) {
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
function encodePainPoints(points = []) {
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

function decodePainPoints(cell) {
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

// Download filename from a map title, e.g. "Order to Cash" -> "order-to-cash.xlsx".
export function xlsxFilename(title) {
  const slug = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'flowlane-map'}.xlsx`
}

function labelToField(label) {
  const trimmed = String(label ?? '').trim()
  return COLUMNS.find((column) => column.label === trimmed)?.field
}

function rowToFieldMap(row, fields) {
  const values = {}
  fields.forEach((field, index) => {
    if (!field) return
    const cell = row[index]
    values[field] = cell === undefined || cell === null ? '' : String(cell).trim()
  })
  return values
}

function hasAnyValue(row) {
  return row.some((cell) => String(cell ?? '').trim() !== '')
}
