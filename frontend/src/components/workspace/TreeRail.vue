<script setup>
// Persistent L1->L2->L3 tree rail for the workspace shell (UI step U2/B2).
// Wraps the existing HierarchyTree (reused unchanged) with a collapse toggle
// so the canvas can get more room, plus the rail-level "New Process" action
// that used to live in ClientWorkspace's page header. Presentation + collapse
// state only — selection/mutation handling stays owned by the shell page,
// forwarded straight through via `v-on="$attrs"` (all-listeners passthrough).
import { FeatherIcon, Button } from 'frappe-ui'
import HierarchyTree from '@/components/HierarchyTree.vue'

defineProps({
  processes: { type: Array, default: () => [] },
  selectedName: { type: String, default: '' },
  autoExpand: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['update:collapsed', 'new-process'])

defineOptions({ inheritAttrs: false })
</script>

<template>
  <aside
    class="flex shrink-0 flex-col border-r border-outline-gray-1 bg-surface-white"
    :class="collapsed ? 'w-9' : 'w-72'"
  >
    <div class="flex items-center gap-1 border-b border-outline-gray-1 px-2 py-2">
      <FeatherIcon name="folder" class="h-4 w-4 shrink-0 text-ink-gray-5" />
      <span v-if="!collapsed" class="flex-1 text-xs font-medium uppercase tracking-wide text-ink-gray-5">
        Processes
      </span>
      <Button v-if="!collapsed" variant="ghost" size="sm" @click="emit('new-process')">
        <template #icon><FeatherIcon name="plus" class="h-4 w-4" /></template>
      </Button>
      <button
        class="rounded p-0.5 text-ink-gray-5 hover:bg-surface-gray-2"
        :title="collapsed ? 'Expand tree' : 'Collapse tree'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <FeatherIcon :name="collapsed ? 'chevron-right' : 'chevron-left'" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="!collapsed" class="flex-1 overflow-y-auto p-2">
      <p v-if="!processes.length" class="px-2 py-6 text-center text-sm text-ink-gray-5">
        No processes yet. Use “+” to add one.
      </p>
      <HierarchyTree
        v-else
        :processes="processes"
        :selected-name="selectedName"
        :auto-expand="autoExpand"
        v-on="$attrs"
      />
    </div>
  </aside>
</template>
