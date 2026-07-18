<script setup>
// Excel paste (T2.3). The user pastes a tab/newline block from a spreadsheet;
// the pure parser (map/pasteParser.js) maps columns positionally onto PASTE_FIELDS
// and each parsed row becomes a new Map Step. Column order is shown so the paste
// lands in the right fields.
import { ref, watch } from 'vue'
import { Dialog, Button, FormControl, toast } from 'frappe-ui'
import { parseClipboard } from '@/map/pasteParser.js'
import { PASTE_FIELDS, COLUMNS } from './columns.js'
import { useMapStore } from '@/stores/useMapStore.js'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

const store = useMapStore()
const text = ref('')

const columnLabels = PASTE_FIELDS.map(
  (field) => COLUMNS.find((column) => column.field === field)?.label || field
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) text.value = ''
  }
)

function apply() {
  const rows = parseClipboard(text.value, PASTE_FIELDS)
  if (!rows.length) {
    toast.error('Nothing to paste.')
    return
  }
  store.addRows(rows)
  toast.success(`Added ${rows.length} row${rows.length === 1 ? '' : 's'}.`)
  emit('update:modelValue', false)
}
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title: 'Paste from Excel', size: 'xl' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <div class="flex flex-col gap-3">
        <p class="text-sm text-ink-gray-6">
          Paste tab-separated rows. Columns map in order:
        </p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="(label, i) in columnLabels"
            :key="label"
            class="rounded bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-7"
          >
            {{ i + 1 }}. {{ label }}
          </span>
        </div>
        <FormControl
          type="textarea"
          :rows="8"
          v-model="text"
          placeholder="S1&#9;Receive Enquiry&#9;Sales Executive&#9;Start/End&#9;Email&#9;Lead"
        />
      </div>
    </template>
    <template #actions>
      <Button variant="solid" @click="apply">Add Rows</Button>
    </template>
  </Dialog>
</template>
