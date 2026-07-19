// Minimal ZIP writer (BACKLOG 2.6, "Download as ZIP") — no external
// dependency, same hand-rolled-format reasoning as the sibling pdf.js: the
// ZIP spec's STORE (uncompressed) entry is just two fixed binary header
// layouts (local file header + central directory record) plus an end-of-
// central-directory record, so it needs no deflate implementation, only
// byte-packing and a CRC-32. Pure and browser-free (Uint8Array in,
// Uint8Array out) — unit-tested in the node vitest env.

const encoder = new TextEncoder()
const LOCAL_HEADER_SIG = 0x04034b50
const CENTRAL_HEADER_SIG = 0x02014b50
const END_OF_CENTRAL_SIG = 0x06054b50
const VERSION = 20 // 2.0 — the minimum version that understands plain STORE entries
const STORE = 0 // compression method 0 = no compression

// Build a STORE-method (uncompressed) ZIP archive from `files`, each shaped
// `{ name, data: Uint8Array }`. Returns a Uint8Array ready to download.
export function buildZip(files, { date = new Date() } = {}) {
  const stamp = dosDateTime(date)
  const parts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const crc = crc32(file.data)
    const local = localHeader(nameBytes, crc, file.data.length, stamp)
    parts.push(local, nameBytes, file.data)
    centralParts.push(centralHeader(nameBytes, crc, file.data.length, stamp, offset))
    offset += local.length + nameBytes.length + file.data.length
  }

  const centralStart = offset
  const centralBytes = concat(centralParts)
  const end = endOfCentralDirectory(files.length, centralBytes.length, centralStart)

  return concat([...parts, centralBytes, end])
}

function localHeader(nameBytes, crc, size, stamp) {
  const header = new DataView(new ArrayBuffer(30))
  header.setUint32(0, LOCAL_HEADER_SIG, true)
  header.setUint16(4, VERSION, true)
  header.setUint16(6, 0, true) // general purpose flag
  header.setUint16(8, STORE, true)
  header.setUint16(10, stamp.time, true)
  header.setUint16(12, stamp.date, true)
  header.setUint32(14, crc, true)
  header.setUint32(18, size, true) // compressed size == uncompressed size (STORE)
  header.setUint32(22, size, true)
  header.setUint16(26, nameBytes.length, true)
  header.setUint16(28, 0, true) // extra field length
  return new Uint8Array(header.buffer)
}

function centralHeader(nameBytes, crc, size, stamp, localOffset) {
  const header = new DataView(new ArrayBuffer(46))
  header.setUint32(0, CENTRAL_HEADER_SIG, true)
  header.setUint16(4, VERSION, true) // version made by
  header.setUint16(6, VERSION, true) // version needed to extract
  header.setUint16(8, 0, true) // general purpose flag
  header.setUint16(10, STORE, true)
  header.setUint16(12, stamp.time, true)
  header.setUint16(14, stamp.date, true)
  header.setUint32(16, crc, true)
  header.setUint32(20, size, true)
  header.setUint32(24, size, true)
  header.setUint16(28, nameBytes.length, true)
  header.setUint16(30, 0, true) // extra field length
  header.setUint16(32, 0, true) // comment length
  header.setUint16(34, 0, true) // disk number start
  header.setUint16(36, 0, true) // internal file attributes
  header.setUint32(38, 0, true) // external file attributes
  header.setUint32(42, localOffset, true)
  return concat([new Uint8Array(header.buffer), nameBytes])
}

function endOfCentralDirectory(count, centralSize, centralStart) {
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, END_OF_CENTRAL_SIG, true)
  end.setUint16(4, 0, true) // this disk
  end.setUint16(6, 0, true) // disk with central directory start
  end.setUint16(8, count, true) // entries on this disk
  end.setUint16(10, count, true) // total entries
  end.setUint32(12, centralSize, true)
  end.setUint32(16, centralStart, true)
  end.setUint16(20, 0, true) // comment length
  return new Uint8Array(end.buffer)
}

// DOS date/time bit-packing the ZIP format requires in every header.
function dosDateTime(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosYear = Math.max(0, date.getFullYear() - 1980) // ZIP epoch starts at 1980
  const dosDate = (dosYear << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: dosDate }
}

function concat(chunks) {
  const length = chunks.reduce((sum, c) => sum + c.length, 0)
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

// CRC-32 (ISO 3309 / ITU-T V.42) via a precomputed 256-entry table — the
// standard table-driven implementation every ZIP reader expects.
const CRC_TABLE = buildCrcTable()

function buildCrcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
}

export function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
