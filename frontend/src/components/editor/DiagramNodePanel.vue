<script setup>
// Read-only detail overlay for a clicked diagram node (S9). Shows the Map Step's
// attributes and its outgoing connections; edits still happen in the Table/Wizard.
// Presentation only — the parent owns selection and passes the store row in.
import { computed } from 'vue'
import { Button, FeatherIcon } from 'frappe-ui'

const props = defineProps({
  step: { type: Object, default: null },
  steps: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])

// Fields rendered as a definition list, in reading order. Blank ones are hidden.
const FIELDS = [
  { key: 'lane_role', label: 'Lane Role' },
  { key: 'node_type', label: 'Node Type' },
  { key: 'trigger_input', label: 'Trigger / Input' },
  { key: 'output_result', label: 'Output / Result' },
  { key: 'erpnext_module', label: 'ERPNext Module' },
  { key: 'erpnext_doctype', label: 'ERPNext DocType' },
  { key: 'workflow_state', label: 'Workflow State' },
  { key: 'key_data_fields', label: 'Key Data Fields' },
  { key: 'business_rules', label: 'Business Rules' },
  { key: 'exceptions', label: 'Exceptions' },
  { key: 'controls_approvals', label: 'Controls / Approvals' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'kpis', label: 'KPIs' },
]

const byUid = computed(() => new Map(props.steps.map((s) => [s.uid, s])))

const rows = computed(() =>
  props.step ? FIELDS.filter((f) => props.step[f.key]) : []
)

const connections = computed(() => {
  if (!props.step) return []
  return (props.step.connections || []).map((conn) => {
    const target = byUid.value.get(conn.to_uid)
    const name = target ? target.step_id || target.step_name || '—' : 'unresolved'
    return { label: conn.label, condition: conn.condition, target: name }
  })
})

const painPoints = computed(() => (props.step && props.step.pain_points) || [])
</script>

<template>
  <aside
    v-if="step"
    class="absolute inset-y-0 right-0 z-30 flex w-80 max-w-full flex-col border-l border-outline-gray-1 bg-surface-white shadow-lg"
  >
    <header class="flex items-start gap-2 border-b border-outline-gray-1 px-4 py-3">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-ink-gray-5">{{ step.step_id || 'Step' }}</p>
        <h2 class="truncate text-base font-semibold text-ink-gray-9">
          {{ step.step_name || 'Untitled step' }}
        </h2>
      </div>
      <Button variant="ghost" size="sm" @click="emit('close')">
        <template #icon><FeatherIcon name="x" class="h-4 w-4" /></template>
      </Button>
    </header>

    <div class="flex-1 space-y-4 overflow-auto px-4 py-3 text-sm">
      <dl class="space-y-2">
        <div v-for="row in rows" :key="row.key">
          <dt class="text-xs font-medium text-ink-gray-5">{{ row.label }}</dt>
          <dd class="whitespace-pre-wrap text-ink-gray-8">{{ step[row.key] }}</dd>
        </div>
      </dl>

      <div v-if="connections.length">
        <p class="mb-1 text-xs font-medium text-ink-gray-5">Connections</p>
        <ul class="space-y-1">
          <li
            v-for="(conn, i) in connections"
            :key="i"
            class="flex items-center gap-2 text-ink-gray-8"
          >
            <FeatherIcon name="arrow-right" class="h-3.5 w-3.5 text-ink-gray-4" />
            <span class="font-medium">{{ conn.target }}</span>
            <span v-if="conn.label" class="rounded bg-surface-gray-2 px-1.5 py-0.5 text-xs">
              {{ conn.label }}
            </span>
          </li>
        </ul>
      </div>

      <div v-if="painPoints.length">
        <p class="mb-1 text-xs font-medium text-ink-red-4">Pain Points</p>
        <ul class="space-y-1">
          <li v-for="(pp, i) in painPoints" :key="i" class="text-ink-gray-8">
            {{ pp.description }}
            <span v-if="pp.severity" class="text-xs text-ink-gray-5">({{ pp.severity }})</span>
          </li>
        </ul>
      </div>

      <p v-if="!rows.length && !connections.length" class="text-xs text-ink-gray-5">
        No details captured for this step yet.
      </p>
    </div>
  </aside>
</template>
