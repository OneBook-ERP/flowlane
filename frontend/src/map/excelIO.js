// Pure Map Step <-> spreadsheet-rows conversion (T3.2/T3.3). No Vue, no DOM, no
// `xlsx` import — this is the part of Excel import/export that is worth unit
// testing without a real .xlsx file; excelFile.js wraps it with the actual
// SheetJS calls and is the thin, untested browser-glue layer (same split as
// diagram/pdf.js vs diagram/exportDiagram.js).
//
// Export writes ALL 15 Map Step fields (COLUMNS), not just the 6-field
// Paste-from-Excel subset — a downloaded file is a full data export, not a
// paste-format template.

import { COLUMNS } from '@/components/editor/columns.js'

// [header row, ...data rows] as arrays, ready for XLSX.utils.aoa_to_sheet.
export function stepsToSheetRows(steps) {
  const header = COLUMNS.map((column) => column.label)
  const body = steps.map((step) => COLUMNS.map((column) => step[column.field] ?? ''))
  return [header, ...body]
}

// Inverse: array-of-arrays (first row = header) -> one { field: value } map per
// non-blank row, the same shape parseClipboard() produces for Paste-from-Excel,
// ready for store.addRows. Header cells are matched to COLUMNS by label so a
// re-ordered or trimmed-down file (e.g. a consultant deleted a column) still
// lands on the right field; a header cell that matches nothing known falls back
// to its position so a plain, header-less AI-generated block still imports.
export function sheetRowsToFieldMaps(sheetRows) {
  if (!sheetRows.length) return []
  const [header, ...body] = sheetRows
  const fields = header.map((label, index) => labelToField(label) || COLUMNS[index]?.field)
  return body.filter(hasAnyValue).map((row) => rowToFieldMap(row, fields))
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
