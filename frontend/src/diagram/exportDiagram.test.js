import { describe, it, expect } from 'vitest'
import { exportFilename, EXPORT_FORMATS } from './exportDiagram.js'

describe('exportFilename', () => {
  it('slugifies the map title and appends the extension', () => {
    expect(exportFilename('Opportunity & Quotation — As-Is', 'png')).toBe(
      'opportunity-quotation-as-is.png'
    )
  })

  it('trims separators and collapses runs', () => {
    expect(exportFilename('  Order   Booking!!  ', 'svg')).toBe('order-booking.svg')
  })

  it('falls back to a default name for empty/untitled maps', () => {
    expect(exportFilename('', 'pdf')).toBe('flowlane-map.pdf')
    expect(exportFilename('***', 'jpg')).toBe('flowlane-map.jpg')
  })
})

describe('EXPORT_FORMATS', () => {
  it('offers PNG 1x/2x, JPEG, SVG and PDF with runnable handlers', () => {
    const keys = EXPORT_FORMATS.map((f) => f.key)
    expect(keys).toEqual(['png1', 'png2', 'jpeg', 'svg', 'pdf'])
    EXPORT_FORMATS.forEach((format) => {
      expect(typeof format.run).toBe('function')
      expect(format.ext).toBeTruthy()
    })
  })
})
