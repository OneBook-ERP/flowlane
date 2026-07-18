<script setup>
// One editable grid cell. `text` renders a plain input; `master` and `doctype`
// render a searchable Combobox over the seeded masters or the live DocType list.
// Writes flow straight to the shared store (setField), which schedules autosave.
//
// Density affordances (UI-REVAMP B1/D6):
//   - node-type cells carry a color dot matching the diagram vocabulary;
//   - long free-text cells ellipsize when unfocused and reveal the full value in a
//     hover tooltip (and by focusing the input) — no hard mid-word clipping.
import { computed } from 'vue'
import { FormControl, Combobox, Tooltip } from 'frappe-ui'
import { masterOptions } from '@/data/masters.js'
import { doctypeOptions } from '@/data/erpnext.js'
import { nodeTypeColor } from '@/diagram/nodeColors.js'
import { useMapStore } from '@/stores/useMapStore.js'

const props = defineProps({
  column: { type: Object, required: true },
  step: { type: Object, required: true },
})

const store = useMapStore()

const value = computed(() => props.step[props.column.field] ?? '')

const options = computed(() => {
  if (props.column.type === 'master') return masterOptions(props.column.master)
  if (props.column.type === 'doctype') return doctypeOptions()
  return []
})

// Show the full value on hover for long free-text (ellipsis) and pinned columns.
const tipText = computed(() =>
  (props.column.ellipsis || props.column.tip) && value.value ? String(value.value) : '',
)

const dotClass = computed(() => nodeTypeColor(value.value).dot)

function onInput(next) {
  store.setField(props.step.uid, props.column.field, next ?? '')
}
</script>

<template>
  <!-- node-type: color dot + selector (D6) -->
  <div v-if="column.dot" class="flex items-center gap-2">
    <span class="h-2 w-2 flex-shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
    <Combobox
      class="min-w-0 flex-1"
      size="sm"
      :options="options"
      :modelValue="value"
      :placeholder="`Select ${column.label}`"
      @update:modelValue="onInput"
    />
  </div>

  <!-- free-text: ellipsis when unfocused, full value on hover -->
  <Tooltip v-else-if="column.type === 'text'" :text="tipText" :disabled="!tipText" :hover-delay="0.4">
    <FormControl
      class="gridcell-text w-full"
      type="text"
      size="sm"
      :modelValue="value"
      @update:modelValue="onInput"
    />
  </Tooltip>

  <!-- master / doctype selector -->
  <Combobox
    v-else
    size="sm"
    :options="options"
    :modelValue="value"
    :allow-custom-value="column.type === 'doctype'"
    :placeholder="`Select ${column.label}`"
    @update:modelValue="onInput"
  />
</template>

<style scoped>
/* Long values collapse to a single-line ellipsis while unfocused; focusing the
   input scrolls to the caret so the whole value is reachable (expand-on-focus). */
.gridcell-text :deep(input) {
  text-overflow: ellipsis;
}
</style>
