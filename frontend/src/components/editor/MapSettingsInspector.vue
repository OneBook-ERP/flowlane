<script setup>
// Right-column inspector for the workspace shell (UI step U2/B3). For now this
// only holds map-level settings — Direction / Status / Version — that used to
// live on the "Open Editor" dead-end page (ClientWorkspace's old map detail
// pane). It also reserves the mount point U3 fills with the shared grouped
// step inspector (Wizard tabs + Diagram node click); do not build that here.
import { ref, computed } from 'vue'
import { Button, FormControl, FeatherIcon, toast } from 'frappe-ui'
import { updateMap } from '@/data/tree.js'
import { serverMessage } from '@/data/errors.js'
import MapBadge from '@/components/MapBadge.vue'

const props = defineProps({
  store: { type: Object, required: true },
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['update:collapsed'])

const savingStatus = ref(false)
const header = computed(() => props.store.state.header || {})

const directionOptions = ['Top-to-Bottom', 'Left-to-Right'].map((v) => ({ label: v, value: v }))
const statusOptions = ['Draft', 'In Review', 'Approved'].map((v) => ({ label: v, value: v }))

function setDirection(value) {
  props.store.setDirection(value)
}

async function setStatus(value) {
  if (!value || value === header.value.status) return
  savingStatus.value = true
  try {
    await updateMap(props.store.mapName, { status: value })
    header.value.status = value
  } catch (error) {
    toast.error(serverMessage(error))
  } finally {
    savingStatus.value = false
  }
}
</script>

<template>
  <aside
    class="flex shrink-0 flex-col border-l border-outline-gray-1 bg-surface-white"
    :class="collapsed ? 'w-9' : 'w-64'"
  >
    <div class="flex items-center gap-2 border-b border-outline-gray-1 px-2 py-2">
      <FeatherIcon name="sliders" class="h-4 w-4 shrink-0 text-ink-gray-5" />
      <span v-if="!collapsed" class="flex-1 text-xs font-medium uppercase tracking-wide text-ink-gray-5">
        Inspector
      </span>
      <button
        class="ml-auto rounded p-0.5 text-ink-gray-5 hover:bg-surface-gray-2"
        :title="collapsed ? 'Expand inspector' : 'Collapse inspector'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <FeatherIcon :name="collapsed ? 'chevron-left' : 'chevron-right'" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="!collapsed" class="flex-1 overflow-y-auto p-3">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-gray-5">Map Settings</p>
      <div class="flex flex-col gap-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray-5">Type</span>
          <MapBadge v-if="header.map_type" :map-type="header.map_type" />
        </div>
        <FormControl
          label="Direction"
          type="select"
          :options="directionOptions"
          :modelValue="header.direction"
          @update:modelValue="setDirection"
        />
        <FormControl
          label="Status"
          type="select"
          :options="statusOptions"
          :modelValue="header.status"
          :disabled="savingStatus"
          @update:modelValue="setStatus"
        />
        <div>
          <p class="mb-1 text-xs text-ink-gray-5">Version</p>
          <p class="text-sm text-ink-gray-8">{{ header.version_label || '—' }}</p>
        </div>
      </div>

      <!-- U3 mount point: the shared grouped step inspector (General / I-O /
           Logic / ERPNext) docks here, driven by the step selected in Table,
           Wizard or the Diagram node click. Left as a labelled placeholder so
           this pass stays a navigation/layout reshell, not a feature build. -->
      <div class="mt-5 rounded border border-dashed border-outline-gray-2 p-3 text-xs text-ink-gray-4">
        Step inspector mounts here (U3) — select a step in Table or Diagram.
      </div>
    </div>
  </aside>
</template>
