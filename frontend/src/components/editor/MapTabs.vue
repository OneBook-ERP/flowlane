<script setup>
// Map editor tab bar (S6). Phase 2 delivers the Table tab, Phase 3 the Diagram tab,
// and Phase 4 the Wizard tab. All three are views over one shared store (created in
// the workspace shell) — edits in any tab flow to the others through it.
import { ref } from 'vue'
import TableTab from './TableTab.vue'
import DiagramTab from './DiagramTab.vue'
import WizardTab from './WizardTab.vue'

const tabs = [
  { key: 'table', label: 'Table' },
  { key: 'diagram', label: 'Diagram' },
  { key: 'wizard', label: 'Wizard' },
]
const active = ref('table')
const diagramRef = ref(null)

// The top bar's Export control (UI step U2/B4) lives outside this tab tree, so
// it reaches the live diagram SVG through this exposed accessor instead of a
// prop — Export only works while the Diagram tab is actually mounted.
defineExpose({
  activeTab: active,
  getSvg: () => diagramRef.value?.getSvg?.(),
})
</script>

<template>
  <div class="flex h-full flex-col">
    <nav class="flex gap-1 border-b border-outline-gray-1 px-4">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="border-b-2 px-3 py-2 text-sm font-medium transition-colors"
        :class="
          active === tab.key
            ? 'border-outline-gray-4 text-ink-gray-9'
            : 'border-transparent text-ink-gray-5 hover:text-ink-gray-8'
        "
        @click="active = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- min-w-0 alongside min-h-0: TableTab's grid and DiagramTab's SVG are
         both wider than the viewport at any real step count and rely on their
         own overflow-auto div to scroll — that only works if every ancestor
         in the chain has a bounded width instead of growing to content size
         (see MapWorkspace.vue's root div for the full explanation). -->
    <div class="min-h-0 min-w-0 flex-1">
      <TableTab v-if="active === 'table'" />
      <DiagramTab v-else-if="active === 'diagram'" ref="diagramRef" />
      <WizardTab v-else-if="active === 'wizard'" />
    </div>
  </div>
</template>
