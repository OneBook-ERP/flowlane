<script setup>
// One wizard step's data-entry panel (S7). Renders every Map Step attribute as a
// labelled field, reusing the Table's GridCell so the dropdowns are the SAME
// master-driven editors and every keystroke writes the SAME shared store — no
// parallel data path. Purely presentational: it takes the step row and lets
// GridCell talk to the store directly (setField).
import { COLUMNS } from './columns.js'
import GridCell from './GridCell.vue'

defineProps({
  step: { type: Object, required: true },
})

const fields = COLUMNS
</script>

<template>
  <div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
    <div v-for="field in fields" :key="field.field" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-ink-gray-6">{{ field.label }}</label>
      <GridCell :column="field" :step="step" />
    </div>
  </div>
</template>
