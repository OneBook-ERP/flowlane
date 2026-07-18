<script setup>
// Denser alternative to ClientTile for the home grid's "List" mode (UI-REVAMP
// D2, Tweak panel §5 — "Client home: Card grid / List"). One row per client;
// same data, same intent events, laid out with fixed-width lanes so a long
// account list reads as a scannable table rather than a wall of cards.
import { computed } from 'vue'
import { Dropdown, FeatherIcon } from 'frappe-ui'
import { relativeTime } from '@/format/relativeTime.js'
import { clientStatusChip } from '@/ui/chipColors.js'
import StatusChip from '@/components/StatusChip.vue'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['open', 'rename', 'delete'])

const statusClass = computed(() => clientStatusChip(props.client.status).classes)

const editedLabel = computed(() => relativeTime(props.client.modified) || '—')

const menuItems = [
  { label: 'Rename', onClick: () => emit('rename', props.client) },
  { label: 'Delete', onClick: () => emit('delete', props.client) },
]
</script>

<template>
  <div
    class="group flex h-10 cursor-pointer items-center gap-3 rounded px-2 hover:bg-surface-gray-2"
    @click="emit('open', client)"
  >
    <span class="w-8 shrink-0 text-center text-base">📁</span>
    <span class="min-w-0 flex-1 truncate font-medium text-ink-gray-9">{{ client.client_name }}</span>
    <span class="hidden w-40 shrink-0 truncate text-sm text-ink-gray-5 sm:block">
      {{ client.industry_vertical || 'No vertical' }}
    </span>
    <span class="w-24 shrink-0">
      <StatusChip :label="client.status" :classes="statusClass" />
    </span>
    <span class="hidden w-28 shrink-0 text-right text-xs text-ink-gray-5 md:block">
      {{ client.process_count }} {{ client.process_count === 1 ? 'process' : 'processes' }}
    </span>
    <span class="hidden w-20 shrink-0 text-right text-xs text-ink-gray-4 lg:block">
      {{ editedLabel }}
    </span>
    <Dropdown :options="menuItems" placement="right">
      <button
        class="w-7 shrink-0 rounded p-1 text-ink-gray-5 opacity-0 transition hover:bg-surface-gray-3 group-hover:opacity-100"
        @click.stop
      >
        <FeatherIcon name="more-horizontal" class="h-4 w-4" />
      </button>
    </Dropdown>
  </div>
</template>
