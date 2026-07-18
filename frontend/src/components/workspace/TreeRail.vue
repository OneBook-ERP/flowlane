<script setup>
// Persistent L1->L2->L3 tree rail for the workspace shell (UI step U2/B2).
// Wraps the existing HierarchyTree (reused unchanged) with a collapse toggle
// so the canvas can get more room, plus the rail-level "New Process" action
// that used to live in ClientWorkspace's page header. Presentation + collapse
// state only — selection/mutation handling stays owned by the shell page,
// forwarded straight through via `v-bind="$attrs"` (all-listeners passthrough).
//
// Dark variant (UI step U4, §5 Tweak panel — "Tree rail: Light / Dark") is a
// straight literal-color swap, not frappe-ui's `dark:` variant machinery
// (nothing in this app toggles a root dark class) — HierarchyTree itself
// stays token-driven; this wrapper overlays a dark background + text color
// that reads fine against it, matching the reference's dark nav rail (§3).
import { computed } from 'vue'
import { FeatherIcon, Button } from 'frappe-ui'
import HierarchyTree from '@/components/HierarchyTree.vue'
import { uiPrefs } from '@/ui/uiPrefs.js'

defineProps({
  processes: { type: Array, default: () => [] },
  selectedName: { type: String, default: '' },
  autoExpand: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['update:collapsed', 'new-process'])

defineOptions({ inheritAttrs: false })

const dark = computed(() => uiPrefs.treeTheme === 'dark')
</script>

<template>
  <aside
    class="flex shrink-0 flex-col border-r"
    :class="[
      collapsed ? 'w-9' : 'w-72',
      dark ? 'border-gray-800 bg-gray-900' : 'border-outline-gray-1 bg-surface-white',
    ]"
  >
    <div
      class="flex items-center gap-1 border-b px-2 py-2"
      :class="dark ? 'border-gray-800' : 'border-outline-gray-1'"
    >
      <FeatherIcon name="folder" class="h-4 w-4 shrink-0" :class="dark ? 'text-gray-400' : 'text-ink-gray-5'" />
      <span
        v-if="!collapsed"
        class="flex-1 text-xs font-medium uppercase tracking-wide"
        :class="dark ? 'text-gray-400' : 'text-ink-gray-5'"
      >
        Processes
      </span>
      <Button v-if="!collapsed" variant="ghost" size="sm" @click="emit('new-process')">
        <template #icon>
          <FeatherIcon name="plus" class="h-4 w-4" :class="dark ? 'text-gray-300' : ''" />
        </template>
      </Button>
      <button
        class="rounded p-0.5 hover:bg-surface-gray-2"
        :class="dark ? 'text-gray-400 hover:bg-gray-800' : 'text-ink-gray-5'"
        :title="collapsed ? 'Expand tree' : 'Collapse tree'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <FeatherIcon :name="collapsed ? 'chevron-right' : 'chevron-left'" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="!collapsed" class="flex-1 overflow-y-auto p-2" :class="dark ? 'tree-rail-dark' : ''">
      <p v-if="!processes.length" class="px-2 py-6 text-center text-sm" :class="dark ? 'text-gray-500' : 'text-ink-gray-5'">
        No processes yet. Use “+” to add one.
      </p>
      <HierarchyTree
        v-else
        :processes="processes"
        :selected-name="selectedName"
        :auto-expand="autoExpand"
        v-bind="$attrs"
      />
    </div>
  </aside>
</template>

<style scoped>
/* HierarchyTree renders with light-mode ink/border tokens (it's reused
   unchanged elsewhere, per CONVENTIONS.md, so it isn't rewritten to be
   theme-aware itself) — recolor it as a unit for the dark rail variant. */
.tree-rail-dark :deep(.text-ink-gray-8),
.tree-rail-dark :deep(.text-ink-gray-9) {
  color: theme('colors.gray.200');
}
.tree-rail-dark :deep(.text-ink-gray-5),
.tree-rail-dark :deep(.text-ink-gray-4) {
  color: theme('colors.gray.500');
}
.tree-rail-dark :deep(.border-outline-gray-1) {
  border-color: theme('colors.gray.800');
}
.tree-rail-dark :deep(.hover\:bg-surface-gray-2:hover),
.tree-rail-dark :deep(.hover\:bg-surface-gray-3:hover) {
  background-color: theme('colors.gray.800');
}
.tree-rail-dark :deep(.bg-surface-blue-2) {
  background-color: theme('colors.blue.900');
}
</style>
