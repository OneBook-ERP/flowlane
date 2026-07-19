// "Download all" orchestration (BACKLOG 2.6): renders every map under a
// client, sequentially (one Vue app/store at a time — see renderMapSvg.js),
// and packages the results as either a ZIP of per-map PNGs or one combined
// multi-page PDF. Maps with no steps yet are skipped (DiagramTab has nothing
// to render for them) rather than producing a blank page/file. Browser-only
// glue over the pure zip.js / pdf.js / bulkFilenames.js modules.

import { rasterizeSvg, svgSize } from './thumbnail.js'
import { dataUrlToBytes, buildMultiPagePdf } from './pdf.js'
import { buildZip } from './zip.js'
import { uniqueFilenames } from './bulkFilenames.js'
import { renderMapToSvg } from './renderMapSvg.js'
import { canvasBlob, JPEG_QUALITY } from './exportDiagram.js'

const RASTER_SCALE = 2

// Renders every row's SVG in sequence (bounds memory — only one off-screen
// diagram is mounted at a time) and splits them into rendered/skipped.
async function renderAll(mapRows, onProgress) {
  const rendered = []
  const skipped = []
  for (let i = 0; i < mapRows.length; i += 1) {
    const row = mapRows[i]
    onProgress?.({ index: i + 1, total: mapRows.length, row })
    const svg = await renderMapToSvg(row.name)
    if (svg) rendered.push({ row, svg })
    else skipped.push(row)
  }
  return { rendered, skipped }
}

// Bundle a client's maps into a ZIP of one PNG per map. Returns
// { blob, includedCount, skippedCount }.
export async function buildBulkZip(mapRows, { onProgress } = {}) {
  const { rendered, skipped } = await renderAll(mapRows, onProgress)
  const names = uniqueFilenames(rendered.map((r) => r.row), 'png')
  const files = []
  for (let i = 0; i < rendered.length; i += 1) {
    const bytes = await svgToPngBytes(rendered[i].svg)
    files.push({ name: names[i], data: bytes })
  }
  return {
    blob: new Blob([buildZip(files)], { type: 'application/zip' }),
    includedCount: files.length,
    skippedCount: skipped.length,
  }
}

// Bundle a client's maps into one PDF, one page per map (each page sized to
// that map's own diagram, same as a single-map PDF export). Returns
// { blob, includedCount, skippedCount }.
export async function buildBulkPdf(mapRows, { onProgress } = {}) {
  const { rendered, skipped } = await renderAll(mapRows, onProgress)
  const pages = []
  for (const { svg } of rendered) {
    pages.push(await svgToPdfPage(svg))
  }
  return {
    blob: new Blob([buildMultiPagePdf(pages)], { type: 'application/pdf' }),
    includedCount: pages.length,
    skippedCount: skipped.length,
  }
}

async function svgToPngBytes(svg) {
  const canvas = await rasterizeSvg(svg, { scale: RASTER_SCALE, background: '#ffffff' })
  const blob = await canvasBlob(canvas, 'image/png')
  return new Uint8Array(await blob.arrayBuffer())
}

async function svgToPdfPage(svg) {
  const { width, height } = svgSize(svg)
  const canvas = await rasterizeSvg(svg, { scale: RASTER_SCALE, background: '#ffffff' })
  const jpeg = dataUrlToBytes(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
  return { jpeg, pixelWidth: canvas.width, pixelHeight: canvas.height, pageWidth: width, pageHeight: height }
}
