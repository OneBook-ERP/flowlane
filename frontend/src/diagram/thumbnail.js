// Client-side SVG -> raster helpers. Browser-only (uses Image + canvas), so kept
// out of the pure engine and its node tests. The diagram SVG styles shapes with
// inline presentation attributes, so the serialised markup rasterises faithfully
// without external CSS. Shared by the thumbnail-on-save (T3.4) and the diagram
// export (T5.1) so there is a single SVG->canvas path.

// Content bounds of an <svg>: its own width/height attrs (the generated diagram
// size), not the scrolled viewport.
export function svgSize(svgEl) {
  const width = Number(svgEl.getAttribute('width')) || svgEl.viewBox.baseVal.width || 1
  const height = Number(svgEl.getAttribute('height')) || svgEl.viewBox.baseVal.height || 1
  return { width, height }
}

// Rasterise an <svg> element to a canvas at `scale`, optionally flattened onto a
// background colour (JPEG/PNG want white; a transparent PNG passes null).
export function rasterizeSvg(svgEl, { scale = 1, background = null } = {}) {
  const { width, height } = svgSize(svgEl)
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const markup = new XMLSerializer().serializeToString(clone)
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(drawToCanvas(img, width * scale, height * scale, background))
    img.onerror = reject
    img.src = url
  })
}

// Render an <svg> element to a PNG data URL, scaled to fit `maxWidth` (thumbnail).
export async function svgToPng(svgEl, maxWidth = 480) {
  const { width } = svgSize(svgEl)
  const scale = Math.min(1, maxWidth / width)
  const canvas = await rasterizeSvg(svgEl, { scale, background: '#ffffff' })
  return canvas.toDataURL('image/png')
}

function drawToCanvas(img, width, height, background) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}
