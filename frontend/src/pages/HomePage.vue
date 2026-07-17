<script setup>
// Phase 0 placeholder home. Proves the /flowlane route serves the SPA shell;
// real client/hierarchy screens land in Phase 1.
const fullName = window.full_name || 'there'
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
    <div
      class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-blue-2 text-2xl"
    >
      🛤️
    </div>
    <h1 class="text-2xl font-semibold text-ink-gray-9">Flowlane</h1>
    <p class="max-w-md text-base text-ink-gray-6">
      Welcome, {{ fullName }}. Client business process mapping starts here — the
      workspace lands in Phase 1.
    </p>
  </div>
</template>
