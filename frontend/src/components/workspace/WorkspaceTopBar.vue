<script setup>
// Persistent workspace top bar (UI step U2/B4): Home nav, client name, the
// Process / Sub-process / Map breadcrumb, the As-Is/To-Be badge, and a status
// slot the active MapWorkspace pane teleports its Saved/Saving + Export
// controls into (see MapWorkspace.vue's Teleport target `#topbar-status-slot`
// — a parent can't inject a descendant's provided store, so this is how the
// live map state reaches a bar that sits above the tree/tabs/inspector).
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { FeatherIcon } from 'frappe-ui'
import MapBadge from '@/components/MapBadge.vue'
import { crumbLabel } from '@/workspace/treeContext.js'

const props = defineProps({
  clientName: { type: String, default: '' },
  crumbs: { type: Array, default: () => [] }, // [{level, node}]
})
const emit = defineEmits(['home', 'crumb-click'])

const router = useRouter()
const mapCrumb = computed(() => props.crumbs.find((c) => c.level === 'map'))
</script>

<template>
  <header class="flex h-12 shrink-0 items-center gap-1.5 border-b border-outline-gray-1 px-3">
    <button
      class="flex items-center gap-1.5 rounded px-1.5 py-1 text-sm font-semibold text-ink-gray-9 hover:bg-surface-gray-2"
      @click="router.push({ name: 'Home' })"
    >
      <span class="text-base">🛤️</span>
      Flowlane
    </button>

    <FeatherIcon name="chevron-right" class="h-3.5 w-3.5 shrink-0 text-ink-gray-3" />
    <button
      class="max-w-[10rem] truncate rounded px-1.5 py-1 text-sm text-ink-gray-6 hover:bg-surface-gray-2"
      @click="emit('home')"
    >
      {{ clientName }}
    </button>

    <template v-for="crumb in crumbs" :key="crumb.level">
      <FeatherIcon name="chevron-right" class="h-3.5 w-3.5 shrink-0 text-ink-gray-3" />
      <button
        class="max-w-[14rem] truncate rounded px-1.5 py-1 text-sm hover:bg-surface-gray-2"
        :class="crumb.level === 'map' ? 'font-medium text-ink-gray-9' : 'text-ink-gray-6'"
        @click="emit('crumb-click', crumb)"
      >
        {{ crumbLabel(crumb) }}
      </button>
    </template>

    <MapBadge v-if="mapCrumb" :map-type="mapCrumb.node.map_type" />

    <div id="topbar-status-slot" class="ml-auto flex shrink-0 items-center gap-3"></div>
  </header>
</template>
