<script setup>
// One client "folder" card on the home grid (S1, UI-REVAMP D2). Clicking the
// body opens the client workspace; the ⋯ menu offers rename / delete. Status
// tints the pill. Density-aware (compact grid target: 6-8 per row) via the
// Tweak panel's Density toggle (uiPrefs.js); realistic scan content —
// industry, status, process count, last-edited — instead of a bare name.
import { computed } from 'vue'
import { Dropdown, FeatherIcon } from 'frappe-ui'
import { uiPrefs } from '@/ui/uiPrefs.js'
import { relativeTime } from '@/format/relativeTime.js'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['open', 'rename', 'delete'])

const statusClass = computed(
  () =>
    ({
      Active: 'bg-surface-green-2 text-ink-green-3',
      Prospect: 'bg-surface-amber-2 text-ink-amber-3',
      Archived: 'bg-surface-gray-3 text-ink-gray-6',
    })[props.client.status] || 'bg-surface-gray-3 text-ink-gray-6'
)

const editedLabel = computed(() => {
  const label = relativeTime(props.client.modified)
  return label ? `edited ${label}` : ''
})

const compact = computed(() => uiPrefs.density === 'compact')
const padding = computed(() => (compact.value ? 'p-3' : 'p-4'))
const gap = computed(() => (compact.value ? 'gap-2' : 'gap-3'))

const menuItems = [
  { label: 'Rename', onClick: () => emit('rename', props.client) },
  { label: 'Delete', onClick: () => emit('delete', props.client) },
]
</script>

<template>
  <div
    class="group relative flex cursor-pointer flex-col rounded-lg border border-outline-gray-1 bg-surface-white transition-colors hover:border-outline-gray-3 hover:bg-surface-gray-1"
    :class="[padding, gap]"
    @click="emit('open', client)"
  >
    <div class="flex items-start justify-between">
      <div
        class="flex items-center justify-center rounded-lg bg-surface-blue-2 text-lg"
        :class="compact ? 'h-8 w-8' : 'h-10 w-10 text-xl'"
      >
        📁
      </div>
      <Dropdown :options="menuItems" placement="right">
        <button
          class="rounded p-1 text-ink-gray-5 opacity-0 transition hover:bg-surface-gray-3 group-hover:opacity-100"
          @click.stop
        >
          <FeatherIcon name="more-horizontal" class="h-4 w-4" />
        </button>
      </Dropdown>
    </div>
    <div class="min-w-0">
      <div class="truncate font-medium text-ink-gray-9">{{ client.client_name }}</div>
      <div class="mt-0.5 truncate text-sm text-ink-gray-5">
        {{ client.industry_vertical || 'No vertical' }}
      </div>
    </div>
    <div class="flex items-center justify-between gap-2">
      <span class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium" :class="statusClass">
        {{ client.status }}
      </span>
      <span class="truncate text-xs text-ink-gray-5">
        {{ client.process_count }} {{ client.process_count === 1 ? 'process' : 'processes' }}
      </span>
    </div>
    <div v-if="editedLabel" class="text-xs text-ink-gray-4">{{ editedLabel }}</div>
  </div>
</template>
