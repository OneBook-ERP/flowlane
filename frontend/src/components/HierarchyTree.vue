<script setup>
// Left-hand hierarchy tree for the Client Workspace (S2): Process (L1) ->
// Sub Process (L2) -> Process Map (L3). Rows expand/collapse; each row has a ⋯
// menu (add child / edit / delete / move) and emits intent events. The parent
// page owns the dialogs and mutations — this component is presentation only.
import { ref, watch, computed } from 'vue'
import { Dropdown, FeatherIcon } from 'frappe-ui'
import MapBadge from '@/components/MapBadge.vue'
import { uiPrefs } from '@/ui/uiPrefs.js'

const props = defineProps({
  processes: { type: Array, default: () => [] },
  selectedName: { type: String, default: '' },
  // Names to force-open in addition to whatever the user has toggled — the
  // workspace shell uses this to reveal a deep-linked map's ancestors (U2/B2).
  autoExpand: { type: Array, default: () => [] },
})

// Tweak panel Density (D1): 30px-ish compact tree rows vs a roomier row.
const rowY = computed(() => (uiPrefs.density === 'relaxed' ? 'py-1.5' : 'py-1'))
const emit = defineEmits([
  'select',
  'open-map',
  'new-sub',
  'edit-process',
  'delete-process',
  'new-map',
  'edit-sub',
  'delete-sub',
  'move-sub',
  'edit-map',
  'delete-map',
])

const expanded = ref(new Set())

watch(
  () => props.autoExpand,
  (names) => {
    if (!names?.length) return
    const next = new Set(expanded.value)
    names.forEach((name) => next.add(name))
    expanded.value = next
  },
  { immediate: true }
)

function toggle(name) {
  const next = new Set(expanded.value)
  next.has(name) ? next.delete(name) : next.add(name)
  expanded.value = next
}
const isOpen = (name) => expanded.value.has(name)

function processMenu(process) {
  return [
    { label: 'Add Sub Process', onClick: () => emit('new-sub', process) },
    { label: 'Edit', onClick: () => emit('edit-process', process) },
    { label: 'Delete', onClick: () => emit('delete-process', process) },
  ]
}

function subMenu(process, sub, index) {
  return [
    { label: 'Add Map', onClick: () => emit('new-map', sub) },
    { label: 'Edit', onClick: () => emit('edit-sub', sub) },
    {
      label: 'Move Up',
      condition: () => index > 0,
      onClick: () => emit('move-sub', { process, sub, direction: -1 }),
    },
    {
      label: 'Move Down',
      condition: () => index < process.sub_processes.length - 1,
      onClick: () => emit('move-sub', { process, sub, direction: 1 }),
    },
    { label: 'Delete', onClick: () => emit('delete-sub', sub) },
  ]
}

function mapMenu(map) {
  return [
    { label: 'Open', onClick: () => emit('open-map', map) },
    { label: 'Edit', onClick: () => emit('edit-map', map) },
    { label: 'Delete', onClick: () => emit('delete-map', map) },
  ]
}

const rowClass = (name) =>
  name === props.selectedName ? 'bg-surface-blue-2' : 'hover:bg-surface-gray-2'
</script>

<template>
  <div class="flex flex-col gap-0.5 text-sm">
    <div v-for="process in processes" :key="process.name">
      <!-- L1 Process -->
      <div class="flex items-center gap-1 rounded px-1.5" :class="[rowY, rowClass(process.name)]">
        <button class="p-0.5 text-ink-gray-5" @click="toggle(process.name)">
          <FeatherIcon
            :name="isOpen(process.name) ? 'chevron-down' : 'chevron-right'"
            class="h-4 w-4"
          />
        </button>
        <button
          class="flex-1 truncate text-left font-medium text-ink-gray-8"
          @click="emit('select', { node: process, level: 'process' })"
        >
          {{ process.process_name }}
        </button>
        <Dropdown :options="processMenu(process)" placement="right">
          <button class="rounded p-0.5 text-ink-gray-5 hover:bg-surface-gray-3">
            <FeatherIcon name="more-horizontal" class="h-4 w-4" />
          </button>
        </Dropdown>
      </div>

      <!-- L2 Sub Processes -->
      <div v-if="isOpen(process.name)" class="ml-4 flex flex-col gap-0.5 border-l border-outline-gray-1 pl-2">
        <p
          v-if="!process.sub_processes.length"
          class="px-2 py-1 text-xs italic text-ink-gray-4"
        >
          No sub processes
        </p>
        <div v-for="(sub, index) in process.sub_processes" :key="sub.name">
          <div class="flex items-center gap-1 rounded px-1.5" :class="[rowY, rowClass(sub.name)]">
            <button class="p-0.5 text-ink-gray-5" @click="toggle(sub.name)">
              <FeatherIcon
                :name="isOpen(sub.name) ? 'chevron-down' : 'chevron-right'"
                class="h-4 w-4"
              />
            </button>
            <button
              class="flex-1 truncate text-left text-ink-gray-8"
              @click="emit('select', { node: sub, level: 'sub' })"
            >
              {{ sub.title }}
            </button>
            <Dropdown :options="subMenu(process, sub, index)" placement="right">
              <button class="rounded p-0.5 text-ink-gray-5 hover:bg-surface-gray-3">
                <FeatherIcon name="more-horizontal" class="h-4 w-4" />
              </button>
            </Dropdown>
          </div>

          <!-- L3 Maps -->
          <div v-if="isOpen(sub.name)" class="ml-4 flex flex-col gap-0.5 border-l border-outline-gray-1 pl-2">
            <p v-if="!sub.maps.length" class="px-2 py-1 text-xs italic text-ink-gray-4">
              No maps
            </p>
            <div
              v-for="map in sub.maps"
              :key="map.name"
              class="flex items-center gap-1.5 rounded px-1.5"
              :class="[rowY, rowClass(map.name)]"
            >
              <FeatherIcon name="git-branch" class="h-3.5 w-3.5 shrink-0 text-ink-gray-5" />
              <button
                class="flex-1 truncate text-left text-ink-gray-8"
                @dblclick="emit('open-map', map)"
                @click="emit('select', { node: map, level: 'map' })"
              >
                {{ map.map_title }}
              </button>
              <MapBadge :map-type="map.map_type" />
              <Dropdown :options="mapMenu(map)" placement="right">
                <button class="rounded p-0.5 text-ink-gray-5 hover:bg-surface-gray-3">
                  <FeatherIcon name="more-horizontal" class="h-4 w-4" />
                </button>
              </Dropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
