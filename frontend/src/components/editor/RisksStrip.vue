<script setup>
// "Risks" strip (UI-REVAMP §4): a compact, worst-first list of the map's
// pain points under the diagram (both As-Is and To-Be, BACKLOG 2.5), so
// bottlenecks are visible without opening the Inspector. Reads the
// already-loaded store steps — no new API call — via the pure
// collectRisks() helper; severity coloring comes from the same
// chipColors.js every other severity chip in the app uses.
// Clicking a row selects that node the same way clicking it on the canvas
// does (DiagramTab owns the actual selection state).
import { computed } from 'vue'
import { FeatherIcon } from 'frappe-ui'
import StatusChip from '@/components/StatusChip.vue'
import { collectRisks } from '@/diagram/risks.js'
import { severityChip } from '@/ui/chipColors.js'

const props = defineProps({
  steps: { type: Array, default: () => [] },
})
const emit = defineEmits(['select'])

const risks = computed(() => collectRisks(props.steps))
</script>

<template>
  <div v-if="risks.length" class="shrink-0 border-t border-outline-gray-1 bg-surface-white">
    <div class="flex items-center gap-1.5 px-4 pt-2 text-xs font-medium uppercase tracking-wide text-ink-gray-5">
      <FeatherIcon name="alert-triangle" class="h-3.5 w-3.5" />
      Risks
      <span class="text-ink-gray-4">{{ risks.length }}</span>
    </div>
    <ul class="flex max-h-28 flex-col gap-0.5 overflow-y-auto px-2 py-1.5">
      <li v-for="(risk, i) in risks" :key="i">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-surface-gray-1"
          @click="emit('select', risk.uid)"
        >
          <StatusChip class="shrink-0" :label="risk.severity" :classes="severityChip(risk.severity).classes" />
          <span class="w-36 shrink-0 truncate text-ink-gray-6">{{ risk.stepLabel }}</span>
          <span class="min-w-0 flex-1 truncate text-ink-gray-8">{{ risk.description }}</span>
          <span v-if="risk.painType" class="shrink-0 truncate text-ink-gray-4">{{ risk.painType }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
