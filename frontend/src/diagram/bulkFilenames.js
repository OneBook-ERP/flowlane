// Pure filename logic for bulk export (BACKLOG 2.6). Reuses exportDiagram
// .js's `slugify` for the base name; a plain map title alone isn't enough
// here (two maps can legitimately share a title — "As-Is" under different
// sub-processes — where a single-map export never had to disambiguate), so
// each entry is named after its process/sub-process path, with a numeric
// suffix as a last-resort tiebreaker for any name that still collides.
// No Vue, no network; unit-tested.

import { slugify } from './exportDiagram.js'

// One map row's (BACKLOG 2.1's flattenMaps shape: { ...map, process, sub })
// base filename, without extension or collision handling.
export function mapBaseName(row) {
  const parts = [row.process?.process_name, row.sub?.title, row.map_title].filter(Boolean)
  return slugify(parts.join(' ')) || 'flowlane-map'
}

// Assigns every row a unique `<name>.<ext>`, appending "-2", "-3", ... to
// any base name that repeats after slugging. Order matches `rows`.
export function uniqueFilenames(rows, ext) {
  const seen = new Map()
  return rows.map((row) => {
    const base = mapBaseName(row)
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    const name = count === 1 ? base : `${base}-${count}`
    return `${name}.${ext}`
  })
}
