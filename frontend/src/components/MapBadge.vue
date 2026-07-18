<script setup>
// As-Is / To-Be badge for a map node. Color comes from the centralized
// chipColors.js (UI-REVAMP §3) — this component is now a thin wrapper over
// the shared StatusChip so map-type coloring lives in exactly one place
// alongside status/severity, not duplicated here.
import { computed } from 'vue'
import StatusChip from './StatusChip.vue'
import { mapTypeChip } from '@/ui/chipColors.js'

const props = defineProps({ mapType: { type: String, required: true } })

const classes = computed(() => mapTypeChip(props.mapType).classes)
</script>

<template>
  <StatusChip :label="mapType" :classes="classes" />
</template>
