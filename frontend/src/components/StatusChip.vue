<script setup>
// The one chip markup every status/type/severity indicator in the app
// renders through (UI-REVAMP §3) — callers resolve their color via
// `src/ui/chipColors.js` and pass the resulting Tailwind classes down, so
// there is exactly one chip DOM shape (rounded, px-1.5 py-0.5, text-xs
// font-medium) instead of the same span repeated with drifting padding
// per component. Presentational only.
defineProps({
  label: { type: String, required: true },
  classes: { type: String, required: true },
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium"
    :class="classes"
  >
    {{ label }}
  </span>
</template>
