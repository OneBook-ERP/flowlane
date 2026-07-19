// Parse an Excel / AI-reply clipboard block into Map Step field maps. Tabs
// separate columns, newlines separate rows; each column maps positionally
// onto `columns` (a field-name list, PASTE_FIELDS). Pure and unit-tested —
// no Vue, no DOM, no network.
import { decodeConnections, decodePainPoints } from './childRowFormat.js'

// Returns one `{ field: value }` map per non-empty pasted row — `connections`
// decodes to [{ to_step_id, label, condition }] and `pain_points` to
// [{ description, pain_type, severity }] (see childRowFormat.js), everything
// else is a trimmed string. Extra pasted columns beyond `columns` are
// ignored; missing trailing cells are simply absent.
//
// `columnLabels`, when given (PasteDialog always passes it), lets the parser
// recognise and DROP a leading header row (BUG FIX): the "Copy AI Prompt"
// text explicitly instructs the AI to reply with "one header row with those
// exact column names, then one row per process step" — so a consultant who
// follows that prompt exactly gets a header row back, and pasting it in
// verbatim (the documented flow) silently imported "Step ID / Step Name /
// …" as a bogus extra Map Step. A row only counts as a header when EVERY
// cell matches its column's label (case/whitespace-insensitive) — precise
// enough not to misfire on real data, since our own prompt asks the AI for
// those exact labels. Without `columnLabels` (older/other callers), no
// header is ever skipped — unchanged behaviour.
export function parseClipboard(text, columns, columnLabels) {
  const rows = splitRows(text)
  const dataRows = rows.length && isHeaderRow(rows[0], columnLabels) ? rows.slice(1) : rows
  return dataRows.map((cells) => cellsToFields(cells, columns))
}

// Split a pasted block into rows of raw cell strings. CRLF/CR are normalised and
// fully blank lines are dropped so a trailing newline never yields an empty row.
function splitRows(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('\t'))
}

function isHeaderRow(cells, columnLabels) {
  if (!columnLabels || !columnLabels.length) return false
  return columnLabels.every((label, i) => normalize(cells[i]) === normalize(label))
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase()
}

function cellsToFields(cells, columns) {
  const fields = {}
  columns.forEach((field, index) => {
    const value = cells[index]
    if (value === undefined) return
    if (field === 'connections') fields.connections = decodeConnections(value)
    else if (field === 'pain_points') fields.pain_points = decodePainPoints(value)
    else fields[field] = value.trim()
  })
  return fields
}
