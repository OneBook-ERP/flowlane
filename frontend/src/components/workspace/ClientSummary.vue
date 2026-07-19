<script setup>
// Client summary dashboard (BACKLOG 2.1) — shown in ClientWorkspace's
// empty-state slot (nothing selected in the tree). "Surface the summary
// before the detail": total counts, pain-point/status breakdowns and the
// mapping timeline, so a consultant opening a client sees its shape before
// drilling into any one process. Also hosts the bulk "Download all" export
// (BACKLOG 2.6) since both need the same client-wide map list.
//
// Two things this deliberately does NOT show, because the data doesn't
// exist: a real "mapping start date" field (uses the client's own
// `creation` as a proxy — see flowlane.api.summary) and real version
// history (only a plain status field exists per map today — item 5.1 is
// parked). Modules-in-use is DERIVED from distinct Map Step erpnext_module
// values, not a separately tracked selection.
import { ref, computed } from 'vue'
import { Button, Dropdown, FeatherIcon, toast } from 'frappe-ui'
import StatusChip from '@/components/StatusChip.vue'
import { statusChip, severityChip } from '@/ui/chipColors.js'
import { loadClientSummary } from '@/data/clientSummary.js'
import { flattenMaps } from '@/workspace/treeContext.js'
import { buildBulkZip, buildBulkPdf } from '@/diagram/bulkExport.js'
import { downloadBlob, exportFilename } from '@/diagram/exportDiagram.js'

const props = defineProps({
  client: { type: String, required: true },
  clientName: { type: String, default: '' },
  processes: { type: Array, default: () => [] },
})

const summary = loadClientSummary(props.client)
const mapRows = computed(() => flattenMaps(props.processes))
const hasMaps = computed(() => mapRows.value.length > 0)

const counts = computed(() => summary.data?.counts || { processes: 0, sub_processes: 0, maps: 0 })
const mapStatus = computed(() => summary.data?.map_status || { Draft: 0, 'In Review': 0, Approved: 0 })
const painPoints = computed(() => summary.data?.pain_points || { total: 0, Low: 0, Medium: 0, High: 0 })
const modulesInUse = computed(() => summary.data?.modules_in_use || [])
const clientMeta = computed(() => summary.data?.client || {})

const startDate = computed(() => formatDate(clientMeta.value.creation))
const deadline = computed(() => formatDate(clientMeta.value.mapping_deadline))

const statTiles = computed(() => [
  { key: 'processes', label: 'Processes', value: counts.value.processes, icon: 'git-branch' },
  { key: 'sub_processes', label: 'Sub Processes', value: counts.value.sub_processes, icon: 'folder' },
  { key: 'maps', label: 'Maps', value: counts.value.maps, icon: 'layers' },
  { key: 'pain_points', label: 'Pain Points', value: painPoints.value.total, icon: 'alert-triangle' },
])

const mapStatusRows = computed(() =>
  ['Draft', 'In Review', 'Approved'].map((status) => ({ status, count: mapStatus.value[status] || 0 }))
)
const severityRows = computed(() =>
  ['High', 'Medium', 'Low'].map((severity) => ({ severity, count: painPoints.value[severity] || 0 }))
)

// --- bulk export (BACKLOG 2.6) ---------------------------------------------

const exporting = ref(false)
const exportStatus = ref('')

const exportOptions = [
  { label: 'Download as ZIP (per-map PNGs)', onClick: () => runExport('zip') },
  { label: 'Download as combined PDF', onClick: () => runExport('pdf') },
]

async function runExport(kind) {
  if (exporting.value || !hasMaps.value) return
  exporting.value = true
  try {
    const onProgress = ({ index, total }) => {
      exportStatus.value = `Rendering map ${index} of ${total}…`
    }
    const result =
      kind === 'zip'
        ? await buildBulkZip(mapRows.value, { onProgress })
        : await buildBulkPdf(mapRows.value, { onProgress })
    const ext = kind === 'zip' ? 'zip' : 'pdf'
    downloadBlob(result.blob, exportFilename(`${props.clientName} process maps`, ext))
    const skippedNote = result.skippedCount
      ? `, ${result.skippedCount} skipped (no steps yet)`
      : ''
    toast.success(`Exported ${result.includedCount} map${result.includedCount === 1 ? '' : 's'}${skippedNote}`)
  } catch (error) {
    toast.error(`Bulk export failed: ${error?.message || 'unknown error'}`)
  } finally {
    exporting.value = false
    exportStatus.value = ''
  }
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
      <!-- header: title + the one primary action on this screen -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-ink-gray-9">Client Summary</h2>
          <p class="text-sm text-ink-gray-5">
            {{ clientName }} · {{ clientMeta.industry_vertical || 'No industry vertical' }}
          </p>
        </div>
        <Dropdown :options="exportOptions" placement="right">
          <Button variant="solid" :loading="exporting" :disabled="!hasMaps" label="Download all">
            <template #prefix><FeatherIcon name="download" class="h-4 w-4" /></template>
            Download all
            <template #suffix><FeatherIcon name="chevron-down" class="h-4 w-4" /></template>
          </Button>
        </Dropdown>
      </div>
      <p v-if="exporting" class="-mt-4 text-xs text-ink-gray-5">{{ exportStatus }}</p>
      <p v-else-if="!hasMaps" class="-mt-4 text-xs text-ink-gray-5">
        Add a process, sub process and map to enable bulk export.
      </p>

      <p v-if="summary.loading" class="py-10 text-center text-sm text-ink-gray-5">
        Loading summary…
      </p>

      <template v-else>
        <!-- total counts -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="tile in statTiles"
            :key="tile.key"
            class="flex flex-col gap-2 rounded-lg border border-outline-gray-1 bg-surface-white p-4"
          >
            <div class="flex items-center gap-1.5 text-ink-gray-5">
              <FeatherIcon :name="tile.icon" class="h-3.5 w-3.5" />
              <span class="text-xs font-medium">{{ tile.label }}</span>
            </div>
            <span class="text-2xl font-semibold text-ink-gray-9">{{ tile.value }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- map status breakdown -->
          <div class="flex flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-white p-4">
            <h3 class="text-sm font-medium text-ink-gray-8">Map Status</h3>
            <div v-if="!counts.maps" class="text-sm text-ink-gray-5">No maps yet.</div>
            <div v-else class="flex flex-col gap-2">
              <div v-for="row in mapStatusRows" :key="row.status" class="flex items-center justify-between">
                <StatusChip :label="row.status" :classes="statusChip(row.status).classes" />
                <span class="text-sm text-ink-gray-7">{{ row.count }}</span>
              </div>
            </div>
          </div>

          <!-- pain point severity breakdown -->
          <div class="flex flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-white p-4">
            <h3 class="text-sm font-medium text-ink-gray-8">Pain Points</h3>
            <div v-if="!painPoints.total" class="text-sm text-ink-gray-5">
              No pain points logged yet.
            </div>
            <div v-else class="flex flex-col gap-2">
              <div v-for="row in severityRows" :key="row.severity" class="flex items-center justify-between">
                <StatusChip :label="row.severity" :classes="severityChip(row.severity).classes" />
                <span class="text-sm text-ink-gray-7">{{ row.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- modules in use -->
        <div class="flex flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-white p-4">
          <h3 class="text-sm font-medium text-ink-gray-8">ERPNext Modules In Use</h3>
          <p class="text-xs text-ink-gray-4">
            Derived from the ERPNext Module set on this client's mapped steps.
          </p>
          <div v-if="!modulesInUse.length" class="text-sm text-ink-gray-5">
            No modules linked from any step yet.
          </div>
          <div v-else class="flex flex-wrap gap-1.5">
            <span
              v-for="module_ in modulesInUse"
              :key="module_"
              class="rounded bg-surface-gray-3 px-1.5 py-0.5 text-xs font-medium text-ink-gray-7"
            >
              {{ module_ }}
            </span>
          </div>
        </div>

        <!-- mapping timeline -->
        <div class="flex flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-white p-4">
          <h3 class="text-sm font-medium text-ink-gray-8">Mapping Timeline</h3>
          <p class="-mt-2 text-xs text-ink-gray-4">
            "Mapping started" is when this client record was created — there's no separate
            mapping-start field yet.
          </p>
          <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div class="flex items-center gap-1.5 text-ink-gray-7">
              <FeatherIcon name="calendar" class="h-3.5 w-3.5 text-ink-gray-4" />
              Mapping started
              <span class="font-medium text-ink-gray-9">{{ startDate || '—' }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-ink-gray-7">
              <FeatherIcon name="flag" class="h-3.5 w-3.5 text-ink-gray-4" />
              Deadline
              <span class="font-medium text-ink-gray-9">{{ deadline || 'No deadline set' }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
