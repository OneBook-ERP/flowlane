<script setup>
// The shared, tabbed step inspector (UI-REVAMP D4/D5, UI step U3). Groups the
// 15 Map Step attributes into General / Input-Output / Logic & Rules / ERPNext
// Setup tabs, plus Connections (and Pain Points on As-Is maps) — replacing the
// Wizard's old flat 15-field wall AND the Diagram's old read-only node panel
// with ONE component. Every field editor is the Table's own GridCell, and
// Connections/Pain Points reuse ConnectionsList/PainPointEditor, so writes from
// either mount point go through the exact same store mutators (setField,
// addConnection, addPainPoint, …) — Table, Wizard and Diagram can never diverge.
//
// Presentational only: no local copy of step data, no host-specific chrome
// (no outer scroll/height/close button — each mount point owns its own frame).
import { computed, ref, watch } from 'vue'
import GridCell from './GridCell.vue'
import ConnectionsList from './ConnectionsList.vue'
import PainPointEditor from './PainPointEditor.vue'
import { COLUMNS, columnsByGroup } from './columns.js'
import { nodeTypeColor } from '@/diagram/nodeColors.js'

const props = defineProps({
  step: { type: Object, required: true },
  isAsIs: { type: Boolean, default: false },
})

// Static: the field->tab grouping never depends on props, so compute it once.
const FIELD_GROUPS = columnsByGroup(COLUMNS)

const tabs = computed(() => {
  const fieldTabs = FIELD_GROUPS.map((g) => ({ key: g.group, label: g.group, kind: 'fields', fields: g.fields }))
  const connectionCount = (props.step.connections || []).length
  const painCount = (props.step.pain_points || []).length
  fieldTabs.push({ key: 'connections', label: 'Connections', kind: 'connections', count: connectionCount })
  if (props.isAsIs) {
    fieldTabs.push({ key: 'pain', label: 'Pain Points', kind: 'pain', count: painCount })
  }
  return fieldTabs
})

const activeKey = ref(tabs.value[0].key)
const activeTab = computed(() => tabs.value.find((t) => t.key === activeKey.value) || tabs.value[0])

// Selecting a different step (Table row, Wizard rail, Diagram node) resets to
// General — the previous tab's field group rarely applies to the new step.
watch(
  () => props.step.uid,
  () => {
    activeKey.value = 'General'
  }
)

// A pain-map that goes back to To-Be mid-session shouldn't strand the user on
// a tab that just disappeared.
watch(tabs, (list) => {
  if (!list.some((t) => t.key === activeKey.value)) activeKey.value = list[0].key
})

const dotClass = computed(() => nodeTypeColor(props.step.node_type).dot)
</script>

<template>
  <div class="flex flex-col gap-3">
    <header class="flex items-center gap-2">
      <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-ink-gray-5">{{ step.step_id || 'Step' }}</p>
        <h3 class="truncate text-sm font-semibold text-ink-gray-9">
          {{ step.step_name || 'Untitled step' }}
        </h3>
      </div>
    </header>

    <nav class="flex flex-wrap gap-1 border-b border-outline-gray-1 pb-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
        :class="
          activeKey === tab.key
            ? 'bg-surface-gray-3 text-ink-gray-9'
            : 'text-ink-gray-5 hover:bg-surface-gray-2'
        "
        @click="activeKey = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.count" class="ml-1 text-ink-gray-4">{{ tab.count }}</span>
      </button>
    </nav>

    <div v-if="activeTab.kind === 'fields'" class="flex flex-col gap-3">
      <div v-for="field in activeTab.fields" :key="field.field" class="flex flex-col gap-1">
        <label class="text-xs font-medium text-ink-gray-6">{{ field.label }}</label>
        <GridCell :column="field" :step="step" />
      </div>
    </div>
    <ConnectionsList v-else-if="activeTab.kind === 'connections'" :uid="step.uid" />
    <PainPointEditor v-else-if="activeTab.kind === 'pain'" :step="step" />
  </div>
</template>
