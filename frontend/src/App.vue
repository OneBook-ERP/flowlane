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
    <!-- isolate: frappe-ui's Dialog (reka-ui DialogPortal) teleports to
         document.body — a later SIBLING of this div, not a descendant — and
         its overlay sets no explicit z-index, relying on DOM order among
         z-index:auto boxes. Our sticky Table columns / Diagram overlays use
         explicit z-index (20/30) for internal layering; without a stacking
         context boundary here, those leak into the root stacking context and
         out-rank the dialog's implicit 0 regardless of DOM order, so any
         dialog opened while those are on screen renders BEHIND them. isolate
         contains all of that z-index usage as one unit (itself z-index:auto),
         so a body-portalled dialog — appended after this div — always wins. -->
    <div class="isolate h-screen overflow-hidden bg-surface-base text-ink-gray-9">
      <router-view />
      <TweakPanel />
    </div>
  </FrappeUIProvider>
</template>
