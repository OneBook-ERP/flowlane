<script setup>
// Right-column inspector for the workspace shell (UI step U2/B3; step-content
// switch added post-U3 as a bug-fix follow-up). This is the ONE "Inspector
// (context)" column UI-REVAMP.md's target layout describes: "selected step /
// map settings" — it shows Map Settings (Direction / Status / Version) by
// default, and swaps to the shared StepInspector (UI step U3, D4/D5) whenever
// a Diagram node is selected, via the `selectedStep` prop MapWorkspace.vue
// forwards from DiagramTab. This REPLACES the separate floating
// DiagramNodePanel overlay U3 originally built: that overlay's absolute
// positioning + z-index competed with sticky Table columns and dialogs in
// confusing, inconsistent ways, and a floating panel was a worse fit for "D5:
// docked right" than this column, which is exactly what B2's layout diagram
// specifies. The Wizard tab still mounts StepInspector inline in its own
// panel (a deliberate, separate guided-capture UX, not routed through here).
import { ref, computed } from 'vue'
import { Button, FormControl, FeatherIcon, toast } from 'frappe-ui'
import { updateMap } from '@/data/tree.js'
import { serverMessage } from '@/data/errors.js'
import MapBadge from '@/components/MapBadge.vue'
import StepInspector from './StepInspector.vue'

const props = defineProps({
  store: { type: Object, required: true },
  collapsed: { type: Boolean, default: false },
  selectedStep: { type: Object, default: null },
})
const emit = defineEmits(['update:collapsed', 'clear-selected-step'])

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
    :class="collapsed ? 'w-9' : selectedStep ? 'w-80' : 'w-64'"
  >
    <div
      class="flex items-center gap-2 border-b border-outline-gray-1 px-2 py-2"
      :class="collapsed ? 'justify-center' : ''"
    >
      <!-- Collapsed state drops the leading type icon so only the toggle
           button remains — see the button's own comment for why keeping
           both was the root cause of the "no way to expand back" bug. -->
      <FeatherIcon
        v-if="!collapsed"
        :name="selectedStep ? 'git-branch' : 'sliders'"
        class="h-4 w-4 shrink-0 text-ink-gray-5"
      />
      <span v-if="!collapsed" class="flex-1 truncate text-xs font-medium uppercase tracking-wide text-ink-gray-5">
        {{ selectedStep ? 'Step' : 'Inspector' }}
      </span>
      <button
        class="rounded p-0.5 text-ink-gray-5 hover:bg-surface-gray-2"
        :class="collapsed ? '' : 'ml-auto'"
        :title="collapsed ? 'Expand inspector' : 'Collapse inspector'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <!-- Root cause (bug 2.3): collapsed width is `w-9` (36px). The old
             markup always rendered icon + gap-2 + this button here, which
             needs ~60px — fine for TreeRail (pinned to the LEFT edge, so
             the overflow spills rightward into on-screen canvas space and
             stays clickable/visible) but this Inspector is pinned to the
             RIGHT edge, flush against the viewport boundary, so the same
             overflow pushed the button past x=1440 (viewport width) —
             confirmed live via Playwright bounding boxes (chevron icon
             rendered at x:1439-1455 in a 1440px viewport, i.e. 15 of its
             16px were off-screen with no scrollbar to reach it). Dropping
             the leading icon when collapsed makes the button the ONLY
             child (20px incl. padding, exactly filling the 36px strip
             minus its own px-2 padding), so it never overflows regardless
             of which edge the panel is pinned to. -->
        <FeatherIcon :name="collapsed ? 'chevron-left' : 'chevron-right'" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="!collapsed" class="flex-1 overflow-y-auto p-3">
      <template v-if="selectedStep">
        <button
          class="mb-3 flex items-center gap-1 text-xs text-ink-gray-5 hover:text-ink-gray-8"
          @click="emit('clear-selected-step')"
        >
          <FeatherIcon name="arrow-left" class="h-3.5 w-3.5" />
          Back to Map Settings
        </button>
        <StepInspector :step="selectedStep" />
      </template>

      <template v-else>
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
      </template>
    </div>
  </aside>
</template>
