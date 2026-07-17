<script setup>
// Map Editor (S6) — PHASE 1 STUB. The Wizard / Table / Diagram tabs are built in
// Phases 2-4 and will mount inside `#editor-tabs` below (see CONVENTIONS.md).
// For now this confirms the /m/:map route resolves and shows the map header.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { createResource, Button } from 'frappe-ui'
import MapBadge from '@/components/MapBadge.vue'

const props = defineProps({ map: { type: String, required: true } })
const router = useRouter()

const mapDoc = createResource({
  url: 'frappe.client.get',
  params: { doctype: 'Flowlane Process Map', name: props.map },
  auto: true,
})
const header = computed(() => mapDoc.data || {})
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

    <!-- Phase 2-4 mount the Wizard / Table / Diagram tabs here. -->
    <div
      id="editor-tabs"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <div class="text-3xl">🚧</div>
      <p class="text-base font-medium text-ink-gray-8">Map editor coming soon</p>
      <p class="max-w-md text-sm text-ink-gray-5">
        The Wizard, Table, and Diagram tabs land in Phases 2-4. This route is the
        stable mount point for them.
      </p>
    </div>
  </div>
</template>
