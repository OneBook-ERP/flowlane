<script setup>
// App shell. FrappeUIProvider mounts the toast/portal providers once at the root.
// Master dropdown datasets are fetched once here and shared via data/masters.js.
// TweakPanel (UI step U4, §5) mounts once here too, so the density/layout
// comparison toggles are available on every screen, not just inside a map.
import { FrappeUIProvider } from 'frappe-ui'
import { masters } from '@/data/masters.js'
import TweakPanel from '@/components/TweakPanel.vue'

masters.fetch()
</script>

<template>
  <FrappeUIProvider>
    <div class="h-screen overflow-hidden bg-surface-base text-ink-gray-9">
      <router-view />
      <TweakPanel />
    </div>
  </FrappeUIProvider>
</template>
