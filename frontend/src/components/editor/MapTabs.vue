<script setup>
// Map editor tab bar (S6). Phase 2 delivers the Table tab and Phase 3 the Diagram
// tab; Wizard (Phase 4) is still a labelled placeholder so the tab bar is stable
// and that phase only fills its panel. All tabs share one store (from MapEditor).
import { ref } from 'vue'
import TableTab from './TableTab.vue'
import DiagramTab from './DiagramTab.vue'

const tabs = [
  { key: 'table', label: 'Table' },
  { key: 'diagram', label: 'Diagram' },
  { key: 'wizard', label: 'Wizard' },
]
const active = ref('table')
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

    <div class="min-h-0 flex-1">
      <TableTab v-if="active === 'table'" />
      <DiagramTab v-else-if="active === 'diagram'" />
      <div
        v-else
        class="flex h-full flex-col items-center justify-center gap-2 text-center"
      >
        <div class="text-2xl">🚧</div>
        <p class="text-sm font-medium text-ink-gray-8">
          Wizard tab coming in a later phase
        </p>
        <p class="max-w-sm text-xs text-ink-gray-5">
          The guided wizard builds on the same step data as the Table and Diagram.
        </p>
      </div>
    </div>
  </div>
</template>
