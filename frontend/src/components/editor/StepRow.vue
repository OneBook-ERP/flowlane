<script setup>
// One Map Step row: reorder controls, a GridCell per column, a connections
// button (opens the connection editor), and delete. All mutations go through the
// shared store, so this component holds no local step state.
import { computed } from 'vue'
import { Button, FeatherIcon } from 'frappe-ui'
import { COLUMNS } from './columns.js'
import GridCell from './GridCell.vue'
import { useMapStore } from '@/stores/useMapStore.js'

const props = defineProps({
  step: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
})
const emit = defineEmits(['edit-connections'])

const store = useMapStore()
const columns = COLUMNS
const connectionCount = computed(() => props.step.connections.length)
</script>

<template>
  <tr class="border-b border-outline-gray-1 hover:bg-surface-gray-1">
    <!-- order + row number -->
    <td class="sticky left-0 z-10 whitespace-nowrap bg-surface-white px-2 py-1 align-middle">
      <div class="flex items-center gap-1">
        <div class="flex flex-col">
          <button
            class="text-ink-gray-5 hover:text-ink-gray-8 disabled:opacity-30"
            :disabled="index === 0"
            @click="store.moveStepBy(step.uid, -1)"
          >
            <FeatherIcon name="chevron-up" class="h-3.5 w-3.5" />
          </button>
          <button
            class="text-ink-gray-5 hover:text-ink-gray-8 disabled:opacity-30"
            :disabled="index === total - 1"
            @click="store.moveStepBy(step.uid, 1)"
          >
            <FeatherIcon name="chevron-down" class="h-3.5 w-3.5" />
          </button>
        </div>
        <span class="w-5 text-center text-xs text-ink-gray-5">{{ index + 1 }}</span>
      </div>
    </td>

    <!-- editable fields -->
    <td v-for="column in columns" :key="column.field" class="px-1 py-1 align-top" :class="column.width">
      <GridCell :column="column" :step="step" />
    </td>

    <!-- connections -->
    <td class="px-2 py-1 align-middle">
      <Button variant="subtle" size="sm" @click="emit('edit-connections', step.uid)">
        <template #prefix><FeatherIcon name="git-branch" class="h-3.5 w-3.5" /></template>
        {{ connectionCount || 'Connect' }}
      </Button>
    </td>

    <!-- delete -->
    <td class="sticky right-0 z-10 bg-surface-white px-2 py-1 align-middle">
      <Button variant="ghost" size="sm" @click="store.removeStep(step.uid)">
        <template #icon><FeatherIcon name="trash-2" class="h-4 w-4 text-ink-red-3" /></template>
      </Button>
    </td>
  </tr>
</template>
