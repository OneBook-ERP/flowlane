<script setup>
// One editable grid cell. `text` renders a plain input; `master` and `doctype`
// render a searchable Combobox over the seeded masters or the live DocType list.
// Writes flow straight to the shared store (setField), which schedules autosave.
import { computed } from 'vue'
import { FormControl, Combobox } from 'frappe-ui'
import { masterOptions } from '@/data/masters.js'
import { doctypeOptions } from '@/data/erpnext.js'
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

function onInput(next) {
  store.setField(props.step.uid, props.column.field, next ?? '')
}
</script>

<template>
  <FormControl
    v-if="column.type === 'text'"
    type="text"
    size="sm"
    :modelValue="value"
    @update:modelValue="onInput"
  />
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
