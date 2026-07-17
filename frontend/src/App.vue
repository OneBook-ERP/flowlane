<script setup>
// App shell. FrappeUIProvider mounts the toast/portal providers once at the root.
// Master dropdown datasets are fetched once here and shared via data/masters.js.
import { FrappeUIProvider } from 'frappe-ui'
import { masters } from '@/data/masters.js'

masters.fetch()
</script>

<template>
  <FrappeUIProvider>
    <div class="h-screen overflow-hidden bg-surface-base text-ink-gray-9">
      <router-view />
    </div>
  </FrappeUIProvider>
</template>
