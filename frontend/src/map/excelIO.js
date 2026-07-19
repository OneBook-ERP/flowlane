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
// one cell each — see map/childRowFormat.js, shared with pasteParser.js's
// Paste-from-AI import so the two paths accept the identical column format.
// Import-side upsert (matching rows back onto existing steps instead of
// always appending) lives in map/excelImport.js, since it needs the live
// store's steps, not just row<->field conversion.

import { COLUMNS } from '@/components/editor/columns.js'
import { encodeConnections, decodeConnections, encodePainPoints, decodePainPoints } from './childRowFormat.js'

const CONNECTIONS_LABEL = 'Connections'
const PAIN_POINTS_LABEL = 'Pain Points'

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
// ready for store.importRows. Header cells are matched to COLUMNS by
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
