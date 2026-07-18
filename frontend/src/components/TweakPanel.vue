<script setup>
// Floating comparison panel for the revamp (ui-design rule + UI-REVAMP §5).
// Docked bottom-right, on every screen (mounted once in App.vue). Each row is
// a real layout/visual fork, not a cosmetic toggle — see uiPrefs.js for what
// each key actually changes. Collapses to a small gear button so it never
// blocks the content it's letting you compare.
import { ref } from 'vue'
import { Button, FeatherIcon } from 'frappe-ui'
import { uiPrefs, resetUiPrefs } from '@/ui/uiPrefs.js'

const open = ref(false)

const TOGGLES = [
  {
    key: 'density',
    label: 'Density',
    options: [
      { value: 'compact', label: 'Compact' },
      { value: 'relaxed', label: 'Relaxed' },
    ],
  },
  {
    key: 'homeMode',
    label: 'Client home',
    options: [
      { value: 'grid', label: 'Card grid' },
      { value: 'list', label: 'List' },
    ],
  },
  {
    key: 'treeTheme',
    label: 'Tree rail',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  },
  {
    key: 'inspectorMode',
    label: 'Inspector',
    options: [
      { value: 'docked', label: 'Docked' },
      { value: 'overlay', label: 'Overlay' },
    ],
  },
  {
    key: 'tableTextMode',
    label: 'Table text',
    options: [
      { value: 'ellipsis', label: 'Ellipsis' },
      { value: 'wrap', label: 'Wrap' },
    ],
  },
]
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50">
    <button
      v-if="!open"
      class="flex h-9 w-9 items-center justify-center rounded-full border border-outline-gray-2 bg-surface-white text-ink-gray-6 shadow-md hover:text-ink-gray-9"
      title="Open Tweak panel"
      @click="open = true"
    >
      <FeatherIcon name="sliders" class="h-4 w-4" />
    </button>

    <div
      v-else
      class="flex w-64 flex-col gap-3 rounded-lg border border-outline-gray-2 bg-surface-white p-3 shadow-lg"
    >
      <div class="flex items-center gap-2">
        <FeatherIcon name="sliders" class="h-3.5 w-3.5 text-ink-gray-5" />
        <span class="flex-1 text-xs font-medium uppercase tracking-wide text-ink-gray-5">
          Tweak panel
        </span>
        <button class="rounded p-0.5 text-ink-gray-5 hover:bg-surface-gray-2" @click="open = false">
          <FeatherIcon name="x" class="h-4 w-4" />
        </button>
      </div>

      <div v-for="toggle in TOGGLES" :key="toggle.key" class="flex flex-col gap-1">
        <span class="text-xs text-ink-gray-5">{{ toggle.label }}</span>
        <div class="flex overflow-hidden rounded border border-outline-gray-2">
          <button
            v-for="option in toggle.options"
            :key="option.value"
            class="flex-1 px-2 py-1 text-xs font-medium transition-colors"
            :class="
              uiPrefs[toggle.key] === option.value
                ? 'bg-surface-gray-7 text-white'
                : 'bg-surface-white text-ink-gray-6 hover:bg-surface-gray-2'
            "
            @click="uiPrefs[toggle.key] = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <Button variant="ghost" size="sm" @click="resetUiPrefs">
        <template #prefix><FeatherIcon name="rotate-ccw" class="h-3.5 w-3.5" /></template>
        Reset to defaults
      </Button>
    </div>
  </div>
</template>
