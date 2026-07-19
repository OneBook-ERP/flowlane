<script setup>
// Table tab (S8): the Excel-like Map Step grid. Toolbar adds/pastes rows and shows
// autosave status; the table renders one StepRow per step with a sticky order/
// delete column. All state lives in the shared store (useMapStore); this tab only
// orchestrates the grid, the paste dialog, and the per-row connection editor.
import { ref, computed, onMounted } from 'vue'
import { Button, FeatherIcon, toast } from 'frappe-ui'
import {
  COLUMNS,
  INDEX_COL_WIDTH,
  CONNECTIONS_COL_WIDTH,
  PAIN_COL_WIDTH,
  DELETE_COL_WIDTH,
  stickyLeftOffsets,
  tableMinWidth,
} from './columns.js'
import StepRow from './StepRow.vue'
import PasteDialog from './PasteDialog.vue'
import ConnectionEditorDialog from './ConnectionEditorDialog.vue'
import PainPointDialog from './PainPointDialog.vue'
import { useMapStore } from '@/stores/useMapStore.js'
import { doctypes } from '@/data/erpnext.js'
import { uiPrefs } from '@/ui/uiPrefs.js'
import { downloadStepsAsXlsx, readStepsFromXlsxFile } from '@/map/excelFile.js'
import { xlsxFilename } from '@/map/excelIO.js'

const store = useMapStore()
const columns = COLUMNS
const offsets = stickyLeftOffsets()
const headerY = computed(() => (uiPrefs.density === 'relaxed' ? 'py-3' : 'py-2'))

const pasteOpen = ref(false)
const connection = ref({ open: false, uid: '' })
const pain = ref({ open: false, uid: '' })
const uploadInput = ref(null)
const uploading = ref(false)

const steps = computed(() => store.state.steps)
const isAsIs = computed(() => store.state.header.map_type === 'As-Is')
// Fixed total width so the grid overflows and scrolls horizontally as a whole,
// rather than squeezing every column (UI-REVAMP B1).
const gridWidth = computed(() => tableMinWidth(columns, { isAsIs: isAsIs.value }))
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

function openPainPoints(uid) {
  pain.value = { open: true, uid }
}

// T3.2 — real Excel export: all 15 Map Step fields, fully client-side (no
// backend round-trip).
function downloadExcel() {
  downloadStepsAsXlsx(steps.value, xlsxFilename(store.state.header.map_title))
  toast.success('Downloaded as Excel.')
}

function triggerUpload() {
  uploadInput.value?.click()
}

// T3.3 — real Excel import: parsed client-side via SheetJS (excelFile.js), then
// fed through the SAME store.addRows the clipboard-paste importer uses.
async function handleUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // allow re-selecting the same file next time
  if (!file) return
  uploading.value = true
  try {
    const rows = await readStepsFromXlsxFile(file)
    if (!rows.length) {
      toast.error('No rows found in that file.')
      return
    }
    store.addRows(rows)
    toast.success(`Added ${rows.length} row${rows.length === 1 ? '' : 's'} from Excel.`)
  } catch (error) {
    toast.error('Could not read that Excel file.')
  } finally {
    uploading.value = false
  }
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
      <Button variant="subtle" :loading="uploading" @click="triggerUpload">
        <template #prefix><FeatherIcon name="upload" class="h-4 w-4" /></template>
        Upload Excel
      </Button>
      <Button variant="subtle" @click="downloadExcel">
        <template #prefix><FeatherIcon name="download" class="h-4 w-4" /></template>
        Download as Excel
      </Button>
      <input
        ref="uploadInput"
        type="file"
        accept=".xlsx,.xls"
        class="hidden"
        @change="handleUpload"
      />
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
      <table v-else class="table-fixed border-collapse text-sm" :style="{ width: gridWidth + 'px' }">
        <colgroup>
          <col :style="{ width: INDEX_COL_WIDTH + 'px' }" />
          <col v-for="column in columns" :key="column.field" :style="{ width: column.min + 'px' }" />
          <col :style="{ width: CONNECTIONS_COL_WIDTH + 'px' }" />
          <col v-if="isAsIs" :style="{ width: PAIN_COL_WIDTH + 'px' }" />
          <col :style="{ width: DELETE_COL_WIDTH + 'px' }" />
        </colgroup>
        <thead class="sticky top-0 z-20 bg-surface-gray-2 text-left text-xs font-medium text-ink-gray-6">
          <tr>
            <th class="sticky left-0 z-30 bg-surface-gray-2 px-2" :class="headerY">#</th>
            <th
              v-for="column in columns"
              :key="column.field"
              class="truncate px-2 font-medium"
              :class="[headerY, column.sticky ? 'sticky z-30 bg-surface-gray-2' : '']"
              :style="column.sticky ? { left: offsets[column.field] + 'px' } : null"
            >
              {{ column.label }}
            </th>
            <th class="px-2 font-medium" :class="headerY">Connections</th>
            <th v-if="isAsIs" class="px-2 font-medium" :class="headerY">Pain</th>
            <th class="sticky right-0 z-30 bg-surface-gray-2 px-2" :class="headerY"></th>
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
            @edit-pain="openPainPoints"
          />
        </tbody>
      </table>
    </div>

    <PasteDialog v-model="pasteOpen" />
    <ConnectionEditorDialog v-model="connection.open" :uid="connection.uid" />
    <PainPointDialog v-model="pain.open" :uid="pain.uid" />
  </div>
</template>
