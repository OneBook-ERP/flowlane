<script setup>
// Pain Points tab (BACKLOG 2.5), the 4th tab in MapTabs.vue: a REAL, map-wide
// management surface — every pain point across every step, add/edit/delete,
// on both As-Is and To-Be maps (the old As-Is-only gate was lifted
// everywhere it existed; see StepInspector.vue/StepRow.vue/TableTab.vue/
// DiagramTab.vue). Grouped by step (Pain Point's real doctype parent) via
// the pure summarizePainPoints() helper; editing reuses the exact same
// PainPointEditor.vue + store mutators the Wizard/Table already use, so
// there is still exactly one pain-point-editing implementation.
import { ref, computed } from 'vue'
import { Button, FormControl, Combobox, FeatherIcon, toast } from 'frappe-ui'
import { masterOptions } from '@/data/masters.js'
import { useMapStore } from '@/stores/useMapStore.js'
import { severityChip } from '@/ui/chipColors.js'
import { summarizePainPoints } from '@/diagram/risks.js'
import StatusChip from '@/components/StatusChip.vue'
import PainPointEditor from './PainPointEditor.vue'

const store = useMapStore()

const SEVERITIES = ['Low', 'Medium', 'High']
const typeOptions = computed(() => masterOptions('pain_point_type'))
const stepOptions = computed(() =>
  store.state.steps.map((step) => ({
    label: step.step_id ? `${step.step_id} · ${step.step_name || 'Untitled'}` : step.step_name || 'Untitled',
    value: step.uid,
  }))
)

const summary = computed(() => summarizePainPoints(store.state.steps))
// Pull the live step object back in for each summarized step so its section
// can mount the real PainPointEditor (summarizePainPoints only returns a
// display-shaped summary, not the row itself).
const stepSections = computed(() =>
  summary.value.steps.map((s) => ({ ...s, step: store.findStep(s.uid) })).filter((s) => s.step)
)

const newPoint = ref(blankNewPoint())

function blankNewPoint() {
  return { uid: '', description: '', pain_type: '', severity: 'Medium' }
}

function addPoint() {
  if (!newPoint.value.uid) {
    toast.error('Pick a step first.')
    return
  }
  if (!newPoint.value.description.trim()) {
    toast.error('Add a description.')
    return
  }
  store.addPainPoint(newPoint.value.uid, {
    description: newPoint.value.description.trim(),
    pain_type: newPoint.value.pain_type,
    severity: newPoint.value.severity,
  })
  toast.success('Pain point added.')
  // Keep the step selected — a consultant working through one step's issues
  // usually logs more than one in a row.
  newPoint.value = { ...blankNewPoint(), uid: newPoint.value.uid }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-4">
    <p v-if="store.state.loading" class="py-10 text-center text-sm text-ink-gray-5">Loading steps…</p>
    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <p class="text-sm text-ink-gray-6">
          <span class="font-medium text-ink-gray-9">{{ summary.total }}</span>
          pain point{{ summary.total === 1 ? '' : 's' }} across {{ stepSections.length }}
          step{{ stepSections.length === 1 ? '' : 's' }}
        </p>
        <div class="flex gap-1.5">
          <StatusChip
            v-for="sev in SEVERITIES.slice().reverse()"
            :key="sev"
            :label="`${sev} ${summary.bySeverity[sev]}`"
            :classes="severityChip(sev).classes"
          />
        </div>
      </div>

      <div class="mb-5 flex flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-gray-1 p-3">
        <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">Add pain point</p>
        <p v-if="!stepOptions.length" class="text-sm text-ink-gray-5">
          Add steps in the Table or Wizard tab first — a pain point needs a step to attach to.
        </p>
        <div v-else class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-2">
            <div class="min-w-48 flex-1">
              <label class="mb-1 block text-xs text-ink-gray-5">Step</label>
              <Combobox
                :options="stepOptions"
                :modelValue="newPoint.uid"
                placeholder="Select a step"
                @update:modelValue="newPoint.uid = $event"
              />
            </div>
            <div class="min-w-36 flex-1">
              <label class="mb-1 block text-xs text-ink-gray-5">Type</label>
              <Combobox
                :options="typeOptions"
                :modelValue="newPoint.pain_type"
                placeholder="Select type"
                @update:modelValue="newPoint.pain_type = $event"
              />
            </div>
            <div class="w-36">
              <FormControl
                type="select"
                label="Severity"
                :options="SEVERITIES"
                :modelValue="newPoint.severity"
                @update:modelValue="newPoint.severity = $event"
              />
            </div>
          </div>
          <FormControl
            type="textarea"
            :rows="2"
            label="Description"
            placeholder="e.g. Quotes tracked in Excel — duplicate entry"
            :modelValue="newPoint.description"
            @update:modelValue="newPoint.description = $event"
          />
          <Button class="w-fit" variant="solid" @click="addPoint">
            <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
            Add pain point
          </Button>
        </div>
      </div>

      <p v-if="!stepSections.length" class="text-sm text-ink-gray-5">No pain points captured yet.</p>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="section in stepSections"
          :key="section.uid"
          class="rounded-lg border border-outline-gray-1"
        >
          <div class="flex items-center gap-2 border-b border-outline-gray-1 bg-surface-gray-1 px-3 py-2">
            <span class="text-sm font-medium text-ink-gray-8">{{ section.stepLabel }}</span>
            <StatusChip :label="section.severity" :classes="severityChip(section.severity).classes" />
            <span class="text-xs text-ink-gray-5">{{ section.count }} point{{ section.count === 1 ? '' : 's' }}</span>
          </div>
          <div class="p-3">
            <PainPointEditor :step="section.step" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
