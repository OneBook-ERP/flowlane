// Parse an Excel / clipboard block into Map Step field maps. Tabs separate
// columns, newlines separate rows; each column maps positionally onto `columns`
// (a field-name list). Pure and unit-tested — no Vue, no DOM, no network.

// Split a pasted block into rows of raw cell strings. CRLF/CR are normalised and
// fully blank lines are dropped so a trailing newline never yields an empty row.
function splitRows(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('\t'))
}

function cellsToFields(cells, columns) {
  const fields = {}
  columns.forEach((field, index) => {
    const value = cells[index]
    if (value !== undefined) fields[field] = value.trim()
  })
  return fields
}

// Returns one `{ field: value }` map per non-empty pasted row. Extra pasted
// columns beyond `columns` are ignored; missing trailing cells are simply absent.
export function parseClipboard(text, columns) {
  return splitRows(text).map((cells) => cellsToFields(cells, columns))
}
