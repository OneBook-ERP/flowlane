<script setup>
// Detail/edit overlay for a clicked diagram node (S9). Docks the shared
// StepInspector (UI step U3, D5) — the same grouped-tab editor the Wizard uses —
// so editing a node here writes through the exact same store mutators as
// Table/Wizard. This component owns only the aside's position, sizing and close
// chrome; StepInspector owns the fields, connections and pain points.
import { Button, FeatherIcon } from 'frappe-ui'
import StepInspector from './StepInspector.vue'

defineProps({
  step: { type: Object, default: null },
  isAsIs: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
</script>

<template>
  <aside
    v-if="step"
    class="absolute inset-y-0 right-0 z-30 flex w-96 max-w-full flex-col border-l border-outline-gray-1 bg-surface-white shadow-lg"
  >
    <div class="flex justify-end border-b border-outline-gray-1 px-2 py-1.5">
      <Button variant="ghost" size="sm" @click="emit('close')">
        <template #icon><FeatherIcon name="x" class="h-4 w-4" /></template>
      </Button>
    </div>
    <div class="flex-1 overflow-auto px-4 py-3">
      <StepInspector :step="step" :is-as-is="isAsIs" />
    </div>
  </aside>
</template>
