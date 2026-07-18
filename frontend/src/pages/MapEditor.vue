<script setup>
// Map Editor (S6). Creates the single Map Step store for this map, provides it to
// the editor tabs, and mounts the tab bar (Table this phase; Wizard / Diagram in
// later phases) inside `#editor-tabs`. The header reads from the store once loaded.
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from 'frappe-ui'
import MapBadge from '@/components/MapBadge.vue'
import MapTabs from '@/components/editor/MapTabs.vue'
import { provideMapStore } from '@/stores/useMapStore.js'

const props = defineProps({ map: { type: String, required: true } })
const router = useRouter()

const store = provideMapStore(props.map)
const header = computed(() => store.state.header || {})

onMounted(() => store.load())
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center gap-3 border-b border-outline-gray-1 px-6 py-3">
      <Button variant="ghost" @click="router.back()">← Back</Button>
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold text-ink-gray-9">
          {{ header.map_title || 'Map' }}
        </h1>
        <MapBadge v-if="header.map_type" :map-type="header.map_type" />
      </div>
    </header>

    <!-- The Wizard / Table / Diagram tabs mount here (see CONVENTIONS.md). -->
    <div id="editor-tabs" class="min-h-0 flex-1">
      <MapTabs />
    </div>
  </div>
</template>
