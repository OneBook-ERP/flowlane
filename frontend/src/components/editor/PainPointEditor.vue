<script setup>
// Step-level Pain Point editor (T5.2, F17). Edits the shared store row's
// `pain_points` child rows — description (required), pain type (Link → Flowlane
// Pain Point Type, from masters), severity (Low/Medium/High). All writes go
// through the store mutators, which schedule the same debounced autosave as every
// other edit. Pain points are an As-Is concern, so the parent only mounts this for
// As-Is maps. Presentation only: it holds no copy of the data.
import { computed } from 'vue'
import { Button, FormControl, Combobox, FeatherIcon } from 'frappe-ui'
import { masterOptions } from '@/data/masters.js'
import { useMapStore } from '@/stores/useMapStore.js'
import { severityChip } from '@/ui/chipColors.js'
import StatusChip from '@/components/StatusChip.vue'

const props = defineProps({
  step: { type: Object, required: true },
})

const store = useMapStore()

const SEVERITIES = ['Low', 'Medium', 'High']
const typeOptions = computed(() => masterOptions('pain_point_type'))
const points = computed(() => props.step.pain_points || [])
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="!points.length" class="text-xs text-ink-gray-5">
      No pain points captured. Record As-Is issues like bottlenecks or duplicate
      data entry.
    </p>

    <div
      v-for="(point, index) in points"
      :key="index"
      class="flex flex-col gap-2 rounded border border-outline-gray-1 p-2 sm:flex-row sm:items-end"
    >
      <div class="min-w-0 flex-1">
        <label class="mb-1 block text-xs text-ink-gray-5">Description</label>
        <FormControl
          type="textarea"
          :rows="2"
          :modelValue="point.description"
          placeholder="e.g. Quotes tracked in Excel — duplicate entry"
          @update:modelValue="store.setPainPoint(step.uid, index, { description: $event })"
        />
      </div>
      <div class="w-full sm:w-44">
        <label class="mb-1 block text-xs text-ink-gray-5">Type</label>
        <Combobox
          :options="typeOptions"
          :modelValue="point.pain_type"
          placeholder="Select type"
          @update:modelValue="store.setPainPoint(step.uid, index, { pain_type: $event })"
        />
      </div>
      <div class="flex w-full flex-col gap-1 sm:w-32">
        <FormControl
          type="select"
          label="Severity"
          :options="SEVERITIES"
          :modelValue="point.severity"
          @update:modelValue="store.setPainPoint(step.uid, index, { severity: $event })"
        />
        <StatusChip
          v-if="point.severity"
          class="w-fit"
          :label="point.severity"
          :classes="severityChip(point.severity).classes"
        />
      </div>
      <Button
        variant="ghost"
        label="Remove pain point"
        @click="store.removePainPoint(step.uid, index)"
      >
        <template #icon><FeatherIcon name="trash-2" class="h-4 w-4 text-ink-red-3" /></template>
      </Button>
    </div>

    <Button class="w-fit" variant="subtle" @click="store.addPainPoint(step.uid)">
      <template #prefix><FeatherIcon name="alert-triangle" class="h-4 w-4" /></template>
      Add pain point
    </Button>
  </div>
</template>
