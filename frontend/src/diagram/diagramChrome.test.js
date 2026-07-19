import { describe, it, expect } from 'vitest'
import {
  chromeWidth,
  contentOffsetX,
  legendPositions,
  crumbText,
  metaText,
  CHROME_PADDING,
  LEGEND_ITEM_WIDTH,
} from './diagramChrome.js'

describe('chromeWidth', () => {
  it('keeps the diagram width when it already fits the legend row', () => {
    expect(chromeWidth(2000, 5)).toBe(2000)
  })

  it('grows to fit the legend row on a small/sparse diagram', () => {
    const width = chromeWidth(100, 5)
    expect(width).toBe(5 * LEGEND_ITEM_WIDTH + CHROME_PADDING * 2)
  })
})

describe('contentOffsetX', () => {
  it('is zero when the chrome did not need to grow', () => {
    expect(contentOffsetX(500, 500)).toBe(0)
  })

  it('centers the narrower diagram content within a wider chrome canvas', () => {
    expect(contentOffsetX(700, 500)).toBe(100)
  })

  it('never goes negative', () => {
    expect(contentOffsetX(400, 500)).toBe(0)
  })
})

describe('legendPositions', () => {
  it('returns one x per item, spaced by LEGEND_ITEM_WIDTH', () => {
    const xs = legendPositions(1000, 5)
    expect(xs).toHaveLength(5)
    expect(xs[1] - xs[0]).toBe(LEGEND_ITEM_WIDTH)
    expect(xs[4] - xs[0]).toBe(4 * LEGEND_ITEM_WIDTH)
  })

  it('never starts left of the padding', () => {
    const xs = legendPositions(50, 5)
    expect(xs[0]).toBeGreaterThanOrEqual(CHROME_PADDING)
  })
})

describe('crumbText', () => {
  it('joins client / process / sub-process with a separator', () => {
    expect(
      crumbText({ client_name: 'Acme Co', process_name: 'Order to Cash', sub_process_title: 'Invoicing' })
    ).toBe('Acme Co  ›  Order to Cash  ›  Invoicing')
  })

  it('skips missing ancestry pieces instead of leaving dangling separators', () => {
    expect(crumbText({ client_name: 'Acme Co' })).toBe('Acme Co')
    expect(crumbText({})).toBe('')
    expect(crumbText(undefined)).toBe('')
  })
})

describe('metaText', () => {
  it('joins version and direction with a separator', () => {
    expect(metaText({ version_label: 'v1', direction: 'Top-to-Bottom' })).toBe('v1   ·   Top-to-Bottom')
  })

  it('skips missing pieces', () => {
    expect(metaText({ direction: 'Top-to-Bottom' })).toBe('Top-to-Bottom')
    expect(metaText({})).toBe('')
  })
})
