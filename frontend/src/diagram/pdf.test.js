import { describe, it, expect } from 'vitest'
import { buildPdf, dataUrlToBytes } from './pdf.js'

const decoder = new TextDecoder('latin1')

// A tiny valid baseline-JPEG byte marker pair (SOI ... EOI) — the writer only
// needs to stream the bytes; it does not decode them.
const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9])

describe('buildPdf', () => {
  const pdf = buildPdf({
    jpeg: fakeJpeg,
    pixelWidth: 400,
    pixelHeight: 300,
    pageWidth: 200,
    pageHeight: 150,
  })
  const text = decoder.decode(pdf)

  it('produces a valid PDF envelope', () => {
    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(text.startsWith('%PDF-1.3')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
  })

  it('embeds the JPEG as a DCTDecode image of the right pixel size', () => {
    expect(text).toContain('/Filter /DCTDecode')
    expect(text).toContain('/Width 400')
    expect(text).toContain('/Height 300')
    expect(text).toContain(`/Length ${fakeJpeg.length}`)
    // Raw JPEG bytes are present between stream/endstream.
    expect(text).toContain('\xff\xd8\xff\xe0')
  })

  it('sizes the page to the content points and draws the image to fill it', () => {
    expect(text).toContain('/MediaBox [0 0 200 150]')
    expect(text).toContain('200 0 0 150 0 0 cm')
  })

  it('writes a cross-reference table whose startxref points at "xref"', () => {
    const marker = text.indexOf('\nxref\n') + 1
    const startxref = Number(text.match(/startxref\n(\d+)/)[1])
    expect(startxref).toBe(marker)
    expect(text).toContain('/Root 1 0 R')
  })
})

describe('dataUrlToBytes', () => {
  it('decodes a base64 data URL to its bytes', () => {
    // "PDF" -> base64 "UERG"
    const bytes = dataUrlToBytes('data:image/jpeg;base64,UERG')
    expect(Array.from(bytes)).toEqual([0x50, 0x44, 0x46])
  })
})
