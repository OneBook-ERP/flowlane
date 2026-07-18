<script setup>
// The inline map pane for the workspace shell (UI step U2/B2/B3). Replaces the
// old standalone Editor page: the parent shell mounts this keyed by map name
// (`:key="map"`) so switching maps in the tree rail tears down the old store
// and spins up a fresh one — the same one-store-per-map lifecycle the old
// MapEditor.vue page had, just embedded instead of routed to.
//
// Owns the Map Step store (provideMapStore) so it, and only it, needs to sit
// above MapTabs in the tree; the workspace shell's top bar reaches this pane's
// Saved/Saving + Export controls via Teleport into a slot it renders (see
// WorkspaceTopBar.vue's #topbar-status-slot) since a parent can't inject what
// a descendant provides.
import { ref, computed, onMounted } from 'vue'
import MapTabs from './MapTabs.vue'
import MapSettingsInspector from './MapSettingsInspector.vue'
import ExportMenu from './ExportMenu.vue'
import { provideMapStore } from '@/stores/useMapStore.js'

const props = defineProps({ map: { type: String, required: true } })

const store = provideMapStore(props.map)
const mapTabsRef = ref(null)
const inspectorCollapsed = ref(false)

const hasSteps = computed(() => store.state.steps.length > 0)
const isDiagramActive = computed(() => mapTabsRef.value?.activeTab === 'diagram')
const saveLabel = computed(() =>
  store.state.saving ? 'Saving…' : store.state.dirty ? 'Unsaved changes' : 'All changes saved'
)

function getSvg() {
  return mapTabsRef.value?.getSvg?.()
}

onMounted(() => store.load())
</script>

<template>
  <!-- min-w-0 is load-bearing here, not decorative: this div is a flex-1 item
       inside #editor-tabs (ClientWorkspace.vue), a row flex container. Without
       an explicit min-width, a flex item's automatic minimum width defaults to
       its content's min-content size (here, TableTab's wide fixed-width
       <table>), so this div refused to shrink to the available space and the
       overflow was silently clipped by an ancestor's overflow-hidden instead
       of ever reaching TableTab's own overflow-auto div — the Table tab's
       horizontal scroll (UI-REVAMP B1) never fired. Match this on every
       flex-1 width-bearing wrapper down this tree (see the child div right
       below, and #editor-tabs itself). -->
  <div class="flex h-full min-h-0 min-w-0 flex-1">
    <div class="min-w-0 flex-1">
      <MapTabs ref="mapTabsRef" />
    </div>
    <MapSettingsInspector v-model:collapsed="inspectorCollapsed" :store="store" />
  </div>

  <Teleport to="#topbar-status-slot">
    <span class="text-xs text-ink-gray-5">{{ saveLabel }}</span>
    <ExportMenu
      :get-svg="getSvg"
      :title="store.state.header.map_title || 'flowlane-map'"
      :disabled="!hasSteps || !isDiagramActive"
    />
  </Teleport>
</template>
