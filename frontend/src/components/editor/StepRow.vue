<script setup>
// One Map Step row: reorder controls, a GridCell per column, a connections
// button (opens the connection editor), and delete. All mutations go through the
// shared store, so this component holds no local step state. The index lane and the
// first two data columns (Step ID, Step Name) stay pinned while the grid scrolls
// right, so every row stays identifiable (UI-REVAMP B1).
import { computed } from 'vue'
import { Button, FeatherIcon, Tooltip } from 'frappe-ui'
import { COLUMNS, stickyLeftOffsets } from './columns.js'
import GridCell from './GridCell.vue'
import { useMapStore } from '@/stores/useMapStore.js'
import { uiPrefs } from '@/ui/uiPrefs.js'

const props = defineProps({
  step: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
})
const emit = defineEmits(['edit-connections', 'edit-pain'])

const store = useMapStore()
const columns = COLUMNS
const offsets = stickyLeftOffsets()
const connectionCount = computed(() => props.step.connections.length)
const painCount = computed(() => (props.step.pain_points || []).length)

// Tweak panel Density (D1, §5): compact rows (~36px, B1) vs a roomier row for
// side-by-side comparison. Only the vertical padding changes — column widths
// and sticky behaviour stay identical either way.
const cellY = computed(() => (uiPrefs.density === 'relaxed' ? 'py-2.5' : 'py-1'))

// A pinned cell needs a solid backdrop (so scrolled cells don't bleed through) that
// still tracks the row hover; group-hover keeps it in step with the rest of the row.
const pinnedCell = 'sticky z-10 bg-surface-white group-hover:bg-surface-gray-1'
</script>

<template>
  <tr class="group border-b border-outline-gray-1 hover:bg-surface-gray-1">
    <!-- order + row number (pinned lane) -->
    <td
      class="sticky left-0 z-10 whitespace-nowrap bg-surface-white px-2 align-middle group-hover:bg-surface-gray-1"
      :class="cellY"
    >
      <div class="flex items-center gap-1">
        <div class="flex flex-col">
          <Tooltip text="Move up">
            <button
              class="text-ink-gray-5 hover:text-ink-gray-8 disabled:opacity-30"
              :disabled="index === 0"
              @click="store.moveStepBy(step.uid, -1)"
            >
              <FeatherIcon name="chevron-up" class="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Move down">
            <button
              class="text-ink-gray-5 hover:text-ink-gray-8 disabled:opacity-30"
              :disabled="index === total - 1"
              @click="store.moveStepBy(step.uid, 1)"
            >
              <FeatherIcon name="chevron-down" class="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
        <span class="w-5 flex-shrink-0 text-center text-xs text-ink-gray-5">{{ index + 1 }}</span>
      </div>
    </td>

    <!-- editable fields -->
    <td
      v-for="column in columns"
      :key="column.field"
      class="px-1 align-top"
      :class="[cellY, column.sticky ? pinnedCell : '']"
      :style="column.sticky ? { left: offsets[column.field] + 'px' } : null"
    >
      <GridCell :column="column" :step="step" />
    </td>

    <!-- connections -->
    <td class="px-2 align-middle" :class="cellY">
      <Tooltip text="Edit outgoing connections">
        <Button variant="subtle" size="sm" @click="emit('edit-connections', step.uid)">
          <template #prefix><FeatherIcon name="git-branch" class="h-3.5 w-3.5" /></template>
          {{ connectionCount || 'Connect' }}
        </Button>
      </Tooltip>
    </td>

    <!-- pain points (BACKLOG 2.5: available on both As-Is and To-Be maps) -->
    <td class="px-2 align-middle" :class="cellY">
      <Tooltip text="Record pain points">
        <Button
          variant="subtle"
          size="sm"
          :class="painCount ? 'text-ink-red-3' : ''"
          @click="emit('edit-pain', step.uid)"
        >
          <template #prefix><FeatherIcon name="alert-triangle" class="h-3.5 w-3.5" /></template>
          {{ painCount || 'Pain' }}
        </Button>
      </Tooltip>
    </td>

    <!-- delete -->
    <td class="sticky right-0 z-10 bg-surface-white px-2 align-middle group-hover:bg-surface-gray-1" :class="cellY">
      <Tooltip text="Delete step">
        <Button variant="ghost" size="sm" @click="store.removeStep(step.uid)">
          <template #icon><FeatherIcon name="trash-2" class="h-4 w-4 text-ink-red-3" /></template>
        </Button>
      </Tooltip>
    </td>
  </tr>
</template>
