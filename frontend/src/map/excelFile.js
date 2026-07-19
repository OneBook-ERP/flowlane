// SheetJS glue for real Excel import/export (T3.2/T3.3). All row<->column
// mapping logic is pure and lives in excelIO.js (unit-tested without touching a
// real file); this file is the thin, untested layer that talks to the `xlsx`
// library and the DOM — the same pure/glue split as diagram/pdf.js vs
// diagram/exportDiagram.js.

import * as XLSX from 'xlsx'
import { stepsToSheetRows, sheetRowsToFieldMaps } from './excelIO.js'

const SHEET_NAME = 'Map Steps'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Build a real .xlsx Blob from the current map's steps and trigger a browser
// download under `filename`. Fully client-side — no backend round-trip.
export function downloadStepsAsXlsx(steps, filename) {
  const worksheet = XLSX.utils.aoa_to_sheet(stepsToSheetRows(steps))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME)
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  triggerDownload(new Blob([bytes], { type: XLSX_MIME }), filename)
}

// Parse a File (from an <input type="file"> picker) into paste-pipeline field
// maps — the same { field: value } shape parseClipboard() produces — so the
// caller feeds the result through store.importRows, upserting by step_id.
export async function readStepsFromXlsxFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })
  return sheetRowsToFieldMaps(rows)
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke on the next tick so the click has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
