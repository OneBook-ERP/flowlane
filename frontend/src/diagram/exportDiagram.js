// Diagram export (T5.1, F16). One place that turns the SAME rendered swimlane
// <svg> element the Diagram tab draws (PLAN G8 — one render-to-SVG path) into
// downloadable PNG / JPEG / SVG / PDF, using the content bounds (the svg's own
// width/height), never the scrolled viewport. PNG/JPEG rasterise through the
// shared thumbnail rasteriser; PDF wraps a JPEG raster via the tiny pdf.js writer.
// The pure `exportFilename` helper is unit-tested; the rest needs the browser.

import { rasterizeSvg, svgSize } from './thumbnail.js'
import { buildPdf, dataUrlToBytes } from './pdf.js'

// Exported so bulkExport.js's per-page JPEG raster (combined PDF, BACKLOG
// 2.6) uses the identical quality a single-map export does.
export const JPEG_QUALITY = 0.92

// Export descriptors surfaced by the Export menu. `run` returns a Blob.
export const EXPORT_FORMATS = [
  { key: 'png1', label: 'PNG (1×)', ext: 'png', run: (svg) => toPngBlob(svg, 1) },
  { key: 'png2', label: 'PNG (2×)', ext: 'png', run: (svg) => toPngBlob(svg, 2) },
  { key: 'jpeg', label: 'JPEG', ext: 'jpg', run: (svg) => toJpegBlob(svg, 2) },
  { key: 'svg', label: 'SVG', ext: 'svg', run: (svg) => toSvgBlob(svg) },
  { key: 'pdf', label: 'PDF', ext: 'pdf', run: (svg) => toPdfBlob(svg, 2) },
]

// PNG keeps transparency off (white background) so it reads on any surface, and
// scale drives crispness — 2× doubles the raster resolution for sharp export.
export async function toPngBlob(svgEl, scale = 1) {
  const canvas = await rasterizeSvg(svgEl, { scale, background: '#ffffff' })
  return canvasBlob(canvas, 'image/png')
}

// JPEG cannot be transparent, so it is always flattened onto white.
export async function toJpegBlob(svgEl, scale = 2) {
  const canvas = await rasterizeSvg(svgEl, { scale, background: '#ffffff' })
  return canvasBlob(canvas, 'image/jpeg', JPEG_QUALITY)
}

// SVG export preserves the vector content verbatim; we inject a white background
// rect because the on-screen white comes from a CSS class that a standalone file
// would not carry.
export function toSvgBlob(svgEl) {
  return new Blob([serializeSvg(svgEl, '#ffffff')], { type: 'image/svg+xml;charset=utf-8' })
}

export async function toPdfBlob(svgEl, scale = 2) {
  const { width, height } = svgSize(svgEl)
  const canvas = await rasterizeSvg(svgEl, { scale, background: '#ffffff' })
  const jpeg = dataUrlToBytes(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
  const pdf = buildPdf({
    jpeg,
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
    pageWidth: width,
    pageHeight: height,
  })
  return new Blob([pdf], { type: 'application/pdf' })
}

// Serialise the live svg to a standalone document, optional background colour.
function serializeSvg(svgEl, background) {
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (background) {
    const rect = svgEl.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', background)
    clone.insertBefore(rect, clone.firstChild)
  }
  return new XMLSerializer().serializeToString(clone)
}

// Exported for reuse by diagram/bulkExport.js (BACKLOG 2.6), which rasterises
// per-map canvases the same way a single export does.
export function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      type,
      quality
    )
  })
}

// Trigger a browser download of a Blob under `filename`.
export function downloadBlob(blob, filename) {
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

// URL/filesystem-safe slug from arbitrary text. Pure (unit-tested); shared by
// exportFilename below and diagram/bulkFilenames.js (BACKLOG 2.6), so a
// single-map export and a bulk-export entry name text the same way.
export function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Safe download filename from a map title + extension. Pure (unit-tested).
export function exportFilename(title, ext) {
  return `${slugify(title) || 'flowlane-map'}.${ext}`
}
