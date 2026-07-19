// Minimal image-per-page PDF writer (T5.1, extended BACKLOG 2.6 for bulk
// export) — no external dependency. Each page embeds one baseline JPEG as a
// DCTDecode image XObject filling that page, which is enough to export
// diagrams to a portable PDF without pulling in a PDF library (a JPEG can be
// streamed straight into a PDF, so no deflate is needed). This is NOT a
// general PDF toolkit; it does exactly one job for the exporter.
// Pure and browser-free so it is unit-tested in the node vitest env.

const encoder = new TextEncoder()

// Build a one-page PDF that draws `jpeg` (raw baseline-JPEG bytes, pixelWidth ×
// pixelHeight) to fill a pageWidth × pageHeight point page. Returns a Uint8Array.
// A thin single-page call into buildMultiPagePdf — kept as its own export so
// every existing exportDiagram.js call site is untouched.
export function buildPdf(page) {
  return buildMultiPagePdf([page])
}

// Build a multi-page PDF, one page per entry in `pages` (same shape as
// buildPdf's single argument: { jpeg, pixelWidth, pixelHeight, pageWidth,
// pageHeight }) — the combined-PDF bulk export (BACKLOG 2.6). Object
// numbering is fixed at 3 objects per page (Page, Image, Contents), starting
// at object 3, so the Pages/Kids array can be computed up front.
export function buildMultiPagePdf(pages) {
  const writer = new PdfWriter()
  writer.append('%PDF-1.3\n')

  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  writer.object('<< /Type /Catalog /Pages 2 0 R >>')
  writer.object(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)
  pages.forEach((page) => writePage(writer, page))

  return writer.finish()
}

// Writes one page's three objects (Page, Image XObject, Contents stream) in
// order. The image/contents object numbers are always +1/+2 of the page
// object about to be written, since every page uses exactly 3 objects.
function writePage(writer, { jpeg, pixelWidth, pixelHeight, pageWidth, pageHeight }) {
  const w = Math.round(pageWidth) || pixelWidth
  const h = Math.round(pageHeight) || pixelHeight
  const content = encoder.encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q\n`)
  const pageNum = writer.offsets.length + 1
  const imageNum = pageNum + 1
  const contentNum = pageNum + 2

  writer.object(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
      `/Resources << /XObject << /Im0 ${imageNum} 0 R >> >> /Contents ${contentNum} 0 R >>`
  )
  writer.streamObject(
    `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} ` +
      `/Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
      `/Filter /DCTDecode /Length ${jpeg.length} >>`,
    jpeg
  )
  writer.streamObject(`<< /Length ${content.length} >>`, content)
}

// Decode a `data:...;base64,XXXX` URL (what canvas.toDataURL returns) to bytes.
export function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl).split(',', 2)[1] || ''
  return base64ToBytes(base64)
}

// Assembles PDF objects while tracking byte offsets for the cross-reference table.
class PdfWriter {
  constructor() {
    this.chunks = []
    this.length = 0
    this.offsets = []
  }

  append(data) {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data
    this.chunks.push(bytes)
    this.length += bytes.length
  }

  // A plain dictionary object; numbered by call order starting at 1.
  object(dict) {
    const n = this.offsets.push(this.length)
    this.append(`${n} 0 obj\n${dict}\nendobj\n`)
  }

  // A dictionary followed by a binary stream (image or content).
  streamObject(dict, stream) {
    const n = this.offsets.push(this.length)
    this.append(`${n} 0 obj\n${dict}\nstream\n`)
    this.append(stream)
    this.append('\nendstream\nendobj\n')
  }

  finish() {
    const xrefStart = this.length
    const size = this.offsets.length + 1
    let xref = `xref\n0 ${size}\n0000000000 65535 f \n`
    this.offsets.forEach((offset) => {
      xref += `${String(offset).padStart(10, '0')} 00000 n \n`
    })
    this.append(xref)
    this.append(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`)
    return concat(this.chunks, this.length)
  }
}

function concat(chunks, length) {
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function base64ToBytes(base64) {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
    return out
  }
  return new Uint8Array(Buffer.from(base64, 'base64'))
}
