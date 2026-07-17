<script setup>
// App shell. FrappeUIProvider mounts the toast/portal providers once at the root.
import { FrappeUIProvider } from 'frappe-ui'
</script>

<template>
  <FrappeUIProvider>
    <div class="h-screen bg-surface-base text-ink-gray-9">
      <router-view />
    </div>
  </FrappeUIProvider>
</template>
