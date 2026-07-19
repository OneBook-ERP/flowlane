<script setup>
// The diagram canvas's header strip (BACKLOG 4.2): client / process /
// sub-process breadcrumb, map title, version + direction. Rendered as plain
// SVG (nested inside DiagramTab.vue's <svg>, not a separate DOM tree) so it
// is part of the SAME element exportDiagram.js serializes/rasterizes — no
// duplicate rendering path for on-screen vs. exported.
defineProps({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  crumb: { type: String, default: '' },
  title: { type: String, default: 'Untitled Map' },
  meta: { type: String, default: '' },
})
</script>

<template>
  <g>
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfcfe" />
    <line x1="0" :y1="height" :x2="width" :y2="height" stroke="#e2e8f0" stroke-width="1" />
    <text
      v-if="crumb"
      x="16"
      y="24"
      fill="#64748b"
      font-size="11"
      font-weight="500"
    >
      {{ crumb }}
    </text>
    <text x="16" y="48" fill="#0f172a" font-size="16" font-weight="700">
      {{ title }}
    </text>
    <text
      v-if="meta"
      :x="width - 16"
      y="48"
      fill="#64748b"
      font-size="11"
      text-anchor="end"
    >
      {{ meta }}
    </text>
  </g>
</template>
