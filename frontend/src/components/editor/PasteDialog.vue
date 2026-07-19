<script setup>
// Paste from AI (T2.3/T3.1). The user pastes a tab/newline block — either
// copied straight from a spreadsheet, or an AI chat tool's reply to the
// "Copy AI Prompt" text below — and the pure parser (map/pasteParser.js)
// maps columns positionally onto PASTE_FIELDS (8 columns: the 6 scalar
// fields, then Connections and Pain Points). Each parsed row is upserted by
// step_id via store.importRows — same import pipeline Upload Excel uses
// (map/excelImport.js), so re-pasting an already-imported block updates
// those rows instead of duplicating them, and Connections/Pain Points
// round-trip the same way. Column order is shown so the paste lands in the
// right fields.
import { ref, watch, computed } from 'vue'
import { Dialog, Button, FeatherIcon, FormControl, toast } from 'frappe-ui'
import { parseClipboard } from '@/map/pasteParser.js'
import { buildAiPastePrompt } from '@/map/aiPastePrompt.js'
import { masterOptions } from '@/data/masters.js'
import { PASTE_FIELDS, pasteFieldLabel } from './columns.js'
import { useMapStore } from '@/stores/useMapStore.js'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

const store = useMapStore()
const text = ref('')
const applying = ref(false)

const columnLabels = PASTE_FIELDS.map(pasteFieldLabel)
// Lane Role / Node Type are master-validated on the backend — pass the real
// seeded values into the prompt so the AI picks from them instead of
// inventing something plausible-sounding that save_steps then rejects
// (BUG FIX, see aiPastePrompt.js).
const masterHints = computed(() => ({
  lane_role: masterOptions('lane_role').map((o) => o.value),
  node_type: masterOptions('node_type').map((o) => o.value),
}))

watch(
  () => props.modelValue,
  (open) => {
    if (open) text.value = ''
  }
)

async function apply() {
  // columnLabels lets the parser recognise and drop a leading header row —
  // the AI prompt below explicitly asks for one (BUG FIX, see pasteParser.js).
  const rows = parseClipboard(text.value, PASTE_FIELDS, columnLabels)
  if (!rows.length) {
    toast.error('Nothing to paste.')
    return
  }
  applying.value = true
  try {
    // Awaits the real save (BUG FIX) — a master-validation failure (e.g. an
    // AI-invented Lane Role) used to fail the save silently seconds later,
    // after a "N rows added" toast had already told the user it worked.
    const { added, updated } = await store.importRows(rows)
    toast.success(
      [added ? `${added} new row${added === 1 ? '' : 's'}` : '', updated ? `${updated} updated` : '']
        .filter(Boolean)
        .join(', ')
    )
    emit('update:modelValue', false)
  } catch {
    toast.error(store.state.error || 'Could not save the pasted rows.')
  } finally {
    applying.value = false
  }
}

// T3.1 — "AI paste" mode: copy a documented prompt (same column order as the
// paste mapping above) for the consultant to run in any external AI tool. The
// AI's tab-delimited reply is pasted back into the textarea above, using the
// SAME parser — no separate import path.
async function copyAiPrompt() {
  try {
    await navigator.clipboard.writeText(buildAiPastePrompt(columnLabels, masterHints.value))
    toast.success('Prompt copied — paste it into your AI tool along with your notes.')
  } catch {
    toast.error('Could not copy to clipboard.')
  }
}
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title: 'Paste from AI', size: 'xl' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <div class="flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm text-ink-gray-6">
            Paste tab-separated rows. Columns map in order:
          </p>
          <Button variant="subtle" size="sm" class="shrink-0" @click="copyAiPrompt">
            <template #prefix><FeatherIcon name="clipboard" class="h-4 w-4" /></template>
            Copy AI Prompt
          </Button>
        </div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="(label, i) in columnLabels"
            :key="label"
            class="rounded bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-7"
          >
            {{ i + 1 }}. {{ label }}
          </span>
        </div>
        <p class="text-xs text-ink-gray-5">
          No notes handy? Copy the AI prompt above, run it (with your raw process
          notes) in any AI chat tool, then paste its reply below. Connections:
          "S2 (Yes) | S4 (No)" — target step ID, connector label in
          parentheses. Pain Points: "High: description" — Low/Medium/High,
          more than one separated by " | ".
        </p>
        <FormControl
          type="textarea"
          :rows="8"
          v-model="text"
          placeholder="S1&#9;Receive Enquiry&#9;Sales Executive&#9;Start/End&#9;Email&#9;Lead&#9;S2&#9;Medium: manual re-entry"
        />
      </div>
    </template>
    <template #actions>
      <Button variant="solid" :loading="applying" @click="apply">Add Rows</Button>
    </template>
  </Dialog>
</template>
