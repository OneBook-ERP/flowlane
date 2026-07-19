// Pure layout for the fixed-size header/footer/legend strips wrapped around
// generateSwimlane's own lane geometry (BACKLOG 4.2). The engine still owns
// lanes/nodes/edges untouched — this module only decides how much EXTRA
// canvas space the chrome needs and where its pieces sit, so DiagramTab.vue
// can wrap the engine's output in one translated <g> rather than the engine
// knowing anything about headers or legends. No Vue/DOM; unit-tested.

export const HEADER_HEIGHT = 64
export const LEGEND_ROW_HEIGHT = 34
export const FOOTER_META_HEIGHT = 24
export const FOOTER_HEIGHT = LEGEND_ROW_HEIGHT + FOOTER_META_HEIGHT
export const CHROME_PADDING = 16
export const LEGEND_ITEM_WIDTH = 112

// The legend's own row can need more horizontal room than a small or sparse
// diagram's lane geometry — grow the canvas to fit it rather than letting
// the legend clip or overflow the lanes.
export function chromeWidth(diagramWidth, legendItemCount) {
  const legendWidth = legendItemCount * LEGEND_ITEM_WIDTH + CHROME_PADDING * 2
  return Math.max(diagramWidth, legendWidth)
}

// Horizontal offset that centers the engine's own lane content within a
// (possibly wider, legend-driven) chrome canvas.
export function contentOffsetX(chromeWidthValue, diagramWidth) {
  return Math.max(0, (chromeWidthValue - diagramWidth) / 2)
}

// Left edge x of each legend item, laid out left-to-right and centered as a
// row within `width`.
export function legendPositions(width, legendItemCount) {
  const rowWidth = legendItemCount * LEGEND_ITEM_WIDTH
  const startX = Math.max(CHROME_PADDING, (width - rowWidth) / 2)
  return Array.from({ length: legendItemCount }, (_, i) => startX + i * LEGEND_ITEM_WIDTH)
}

// Breadcrumb line: Client > Process > Sub-process — blank ancestry pieces
// (e.g. before the backend context loads) are skipped rather than leaving a
// dangling separator.
export function crumbText(header) {
  return [header?.client_name, header?.process_name, header?.sub_process_title]
    .filter(Boolean)
    .join('  ›  ')
}

// Trailing header line: version + direction, next to the map title.
export function metaText(header) {
  return [header?.version_label, header?.direction].filter(Boolean).join('   ·   ')
}
