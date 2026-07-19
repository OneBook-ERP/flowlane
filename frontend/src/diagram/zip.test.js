import { describe, it, expect } from 'vitest'
import { buildZip, crc32 } from './zip.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder('latin1')

describe('crc32', () => {
  it('matches the standard "123456789" test vector', () => {
    // The canonical CRC-32 check value every implementation is verified
    // against (ISO 3309 / ITU-T V.42 test vector).
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926)
  })

  it('returns 0 for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})

describe('buildZip', () => {
  const files = [
    { name: 'diagrams/lead-to-quote-as-is.png', data: encoder.encode('fake-png-bytes') },
    { name: 'diagrams/order-booking-to-be.png', data: encoder.encode('another-fake-png') },
  ]
  const zip = buildZip(files, { date: new Date(2026, 6, 19, 10, 30, 0) })
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)

  it('starts each entry with a local file header signature (PK\\x03\\x04)', () => {
    expect(view.getUint32(0, true)).toBe(0x04034b50)
  })

  it('stores each entry uncompressed (method 0) with matching sizes', () => {
    expect(view.getUint16(8, true)).toBe(0) // compression method: STORE
    const uncompressedSize = view.getUint32(22, true)
    expect(uncompressedSize).toBe(files[0].data.length)
  })

  it('embeds the raw file bytes verbatim right after the filename (no compression)', () => {
    const nameLen = view.getUint16(26, true)
    const dataStart = 30 + nameLen
    const extracted = zip.slice(dataStart, dataStart + files[0].data.length)
    expect(decoder.decode(extracted)).toBe('fake-png-bytes')
  })

  it('records a correct CRC-32 for each entry', () => {
    const crc = view.getUint32(14, true)
    expect(crc).toBe(crc32(files[0].data))
  })

  it('writes one central directory record per file, each starting PK\\x01\\x02', () => {
    let count = 0
    for (let i = 0; i < zip.length - 3; i += 1) {
      if (view.getUint32(i, true) === 0x02014b50) count += 1
    }
    expect(count).toBe(files.length)
  })

  it('ends with a valid end-of-central-directory record naming every entry', () => {
    const eocdOffset = zip.length - 22
    expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50)
    expect(view.getUint16(eocdOffset + 10, true)).toBe(files.length) // total entries
  })

  it('produces an empty-but-valid archive for zero files', () => {
    const empty = buildZip([])
    const emptyView = new DataView(empty.buffer)
    expect(empty.length).toBe(22) // just the EOCD record
    expect(emptyView.getUint32(0, true)).toBe(0x06054b50)
  })
})
