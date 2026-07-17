<script setup>
// As-Is / To-Be badge for a map node. As-Is (current state) reads amber; To-Be
// (target state) reads green — a quick visual cue in the tree and detail pane.
import { computed } from 'vue'

const props = defineProps({ mapType: { type: String, required: true } })

const classes = computed(() =>
  props.mapType === 'To-Be'
    ? 'bg-surface-green-2 text-ink-green-3'
    : 'bg-surface-amber-2 text-ink-amber-3'
)
</script>

<template>
  <span
    class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
    :class="classes"
  >
    {{ mapType }}
  </span>
</template>
