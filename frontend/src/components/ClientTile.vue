<script setup>
// One client "folder" tile on the home grid (S1). Clicking the body opens the
// client workspace; the ⋯ menu offers rename / delete. Status tints the pill.
import { computed } from 'vue'
import { Dropdown, FeatherIcon } from 'frappe-ui'

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

const menuItems = [
  { label: 'Rename', onClick: () => emit('rename', props.client) },
  { label: 'Delete', onClick: () => emit('delete', props.client) },
]
</script>

<template>
  <div
    class="group relative flex cursor-pointer flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-white p-4 transition-colors hover:border-outline-gray-3 hover:bg-surface-gray-1"
    @click="emit('open', client)"
  >
    <div class="flex items-start justify-between">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-blue-2 text-xl"
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
    <div>
      <div class="truncate font-medium text-ink-gray-9">{{ client.client_name }}</div>
      <div class="mt-0.5 text-sm text-ink-gray-5">
        {{ client.industry_vertical || 'No vertical' }}
      </div>
    </div>
    <div class="flex items-center justify-between">
      <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="statusClass">
        {{ client.status }}
      </span>
      <span class="text-xs text-ink-gray-5">
        {{ client.process_count }} {{ client.process_count === 1 ? 'process' : 'processes' }}
      </span>
    </div>
  </div>
</template>
