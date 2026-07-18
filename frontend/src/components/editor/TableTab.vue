<script setup>
// Table tab (S8): the Excel-like Map Step grid. Toolbar adds/pastes rows and shows
// autosave status; the table renders one StepRow per step with a sticky order/
// delete column. All state lives in the shared store (useMapStore); this tab only
// orchestrates the grid, the paste dialog, and the per-row connection editor.
import { ref, computed, onMounted } from 'vue'
import { Button, FeatherIcon } from 'frappe-ui'
import { COLUMNS } from './columns.js'
import StepRow from './StepRow.vue'
import PasteDialog from './PasteDialog.vue'
import ConnectionEditorDialog from './ConnectionEditorDialog.vue'
import { useMapStore } from '@/stores/useMapStore.js'
import { doctypes } from '@/data/erpnext.js'

const store = useMapStore()
const columns = COLUMNS

const pasteOpen = ref(false)
const connection = ref({ open: false, uid: '' })

const steps = computed(() => store.state.steps)
const saveLabel = computed(() => {
  if (store.state.saving) return 'Saving…'
  if (store.state.dirty) return 'Unsaved changes'
  return 'All changes saved'
})

onMounted(() => {
  if (!doctypes.data) doctypes.fetch()
})

function openConnections(uid) {
  connection.value = { open: true, uid }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- toolbar -->
    <div class="flex items-center gap-2 border-b border-outline-gray-1 px-4 py-2">
      <Button variant="solid" @click="store.addStep()">
        <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
        Add Row
      </Button>
      <Button variant="subtle" @click="pasteOpen = true">
        <template #prefix><FeatherIcon name="clipboard" class="h-4 w-4" /></template>
        Paste from Excel
      </Button>
      <div class="ml-auto flex items-center gap-2 text-xs text-ink-gray-5">
        <span v-if="store.state.error" class="text-ink-red-3">{{ store.state.error }}</span>
        <span>{{ saveLabel }}</span>
        <Button variant="ghost" size="sm" :loading="store.state.saving" @click="store.save()">
          Save now
        </Button>
      </div>
    </div>

    <!-- grid -->
    <div class="flex-1 overflow-auto">
      <p
        v-if="store.state.loading"
        class="px-4 py-10 text-center text-sm text-ink-gray-5"
      >
        Loading steps…
      </p>
      <p
        v-else-if="!steps.length"
        class="px-4 py-10 text-center text-sm text-ink-gray-5"
      >
        No steps yet. Use “Add Row” or paste from a spreadsheet.
      </p>
      <table v-else class="min-w-full border-collapse text-sm">
        <thead class="sticky top-0 z-20 bg-surface-gray-2 text-left text-xs text-ink-gray-6">
          <tr>
            <th class="sticky left-0 z-30 bg-surface-gray-2 px-2 py-2">#</th>
            <th v-for="column in columns" :key="column.field" class="px-2 py-2 font-medium">
              {{ column.label }}
            </th>
            <th class="px-2 py-2 font-medium">Connections</th>
            <th class="sticky right-0 z-30 bg-surface-gray-2 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody class="bg-surface-white">
          <StepRow
            v-for="(step, index) in steps"
            :key="step.uid"
            :step="step"
            :index="index"
            :total="steps.length"
            @edit-connections="openConnections"
          />
        </tbody>
      </table>
    </div>

    <PasteDialog v-model="pasteOpen" />
    <ConnectionEditorDialog v-model="connection.open" :uid="connection.uid" />
  </div>
</template>
