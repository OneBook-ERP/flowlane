// Client-side SVG -> PNG rasteriser for the map thumbnail (T3.4). Browser-only
// (uses Image + canvas), so it is kept out of the pure engine and its node tests.
// The diagram SVG styles shapes with inline presentation attributes, so the
// serialised markup rasterises faithfully without external CSS.

// Render an <svg> element to a PNG data URL, scaled to fit `maxWidth`.
export function svgToPng(svgEl, maxWidth = 480) {
  const width = Number(svgEl.getAttribute('width')) || svgEl.viewBox.baseVal.width || 1
  const height = Number(svgEl.getAttribute('height')) || svgEl.viewBox.baseVal.height || 1
  const scale = Math.min(1, maxWidth / width)

  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(rasterize(img, width * scale, height * scale))
    img.onerror = reject
    img.src = url
  })
}

function rasterize(img, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // flatten transparency so the tile reads on any bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
