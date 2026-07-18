<script setup>
// Wizard tab (S7): guided, one-panel-per-step capture over the SAME shared store
// as the Table and Diagram (T4.3 — one data set, three views). It walks the map's
// steps one at a time (Prev/Next + a step-list rail), edits each via the shared
// StepInspector (UI step U3 — grouped tabs over Table's GridCell editors, plus
// Connections/Pain Points tabs), and grows the flow with "Add next step" /
// "Add branch" (T4.2) — both create a step and a store Step Connection
// current -> new, then advance to it. No local copy of the steps: navigation is
// the only local state.
import { ref, computed, watch, onMounted } from 'vue'
import { Button, FeatherIcon } from 'frappe-ui'
import StepInspector from './StepInspector.vue'
import { useMapStore } from '@/stores/useMapStore.js'
import { doctypes } from '@/data/erpnext.js'
import { isDecisionType, nextBranchLabel, clampIndex } from '@/map/wizard.js'

const store = useMapStore()

const currentUid = ref('')

const steps = computed(() => store.state.steps)
const currentIndex = computed(() =>
  steps.value.findIndex((step) => step.uid === currentUid.value),
)
const currentStep = computed(() => steps.value[currentIndex.value] || null)
const isDecision = computed(() => isDecisionType(currentStep.value?.node_type))
// Pain points are an As-Is concern (PLAN F17); only surface the editor there so a
// To-Be map is not cluttered with As-Is issues.
const isAsIs = computed(() => store.state.header.map_type === 'As-Is')

const saveLabel = computed(() => {
  if (store.state.saving) return 'Saving…'
  if (store.state.dirty) return 'Unsaved changes'
  return 'All changes saved'
})

onMounted(() => {
  if (!doctypes.data) doctypes.fetch()
})

// Keep the cursor valid. `currentIndex` reacts to the shared array whether it is
// reassigned (load, reorder) or spliced in place (a delete from the Table), so a
// single watcher covers all of them: remember the last valid slot, and when the
// current step vanishes fall back to the nearest surviving neighbour.
let lastIndex = 0
watch(
  currentIndex,
  (index) => {
    if (index !== -1) {
      lastIndex = index
      return
    }
    if (steps.value.length) {
      currentUid.value = steps.value[clampIndex(lastIndex, steps.value.length)].uid
    }
  },
  { immediate: true },
)

function goTo(uid) {
  currentUid.value = uid
}

function goPrev() {
  if (currentIndex.value > 0) currentUid.value = steps.value[currentIndex.value - 1].uid
}

function goNext() {
  if (currentIndex.value < steps.value.length - 1) {
    currentUid.value = steps.value[currentIndex.value + 1].uid
  }
}

// Empty-map entry point: create the first step and select it.
function addFirstStep() {
  const step = store.addStep()
  currentUid.value = step.uid
}

// "Add next step" (T4.2): a new step flowing FROM the current one. Create the step,
// add a store connection current -> new, then advance to it.
function addNextStep() {
  const from = currentStep.value
  const step = store.addStep()
  if (from) store.addConnection(from.uid, { to_uid: step.uid })
  currentUid.value = step.uid
}

// "Add branch" (T4.2): like add-next but the connection carries a branch label
// (Yes/No by default), for a Decision's alternative paths. Reuses the same store
// connection model as the Table's ConnectionEditorDialog.
function addBranch() {
  const from = currentStep.value
  if (!from) return
  const label = nextBranchLabel(from.connections.map((conn) => conn.label))
  const step = store.addStep()
  store.addConnection(from.uid, { to_uid: step.uid, label })
  currentUid.value = step.uid
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- toolbar -->
    <div class="flex items-center gap-2 border-b border-outline-gray-1 px-4 py-2">
      <span class="text-sm font-medium text-ink-gray-8">Guided capture</span>
      <span v-if="steps.length" class="text-xs text-ink-gray-5">
        Step {{ currentIndex + 1 }} of {{ steps.length }}
      </span>
      <div class="ml-auto flex items-center gap-2 text-xs text-ink-gray-5">
        <span v-if="store.state.error" class="text-ink-red-3">{{ store.state.error }}</span>
        <span>{{ saveLabel }}</span>
        <Button variant="ghost" size="sm" :loading="store.state.saving" @click="store.save()">
          Save now
        </Button>
      </div>
    </div>

    <!-- loading / empty -->
    <p v-if="store.state.loading" class="px-4 py-10 text-center text-sm text-ink-gray-5">
      Loading steps…
    </p>
    <div
      v-else-if="!steps.length"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <p class="text-sm text-ink-gray-6">No steps yet. Start the guided capture.</p>
      <Button variant="solid" @click="addFirstStep">
        <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
        Add first step
      </Button>
    </div>

    <!-- rail + panel -->
    <div v-else class="flex min-h-0 flex-1">
      <!-- step list / progress rail -->
      <nav class="w-56 shrink-0 overflow-auto border-r border-outline-gray-1 bg-surface-gray-1 py-2">
        <button
          v-for="(step, index) in steps"
          :key="step.uid"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
          :class="
            step.uid === currentUid
              ? 'bg-surface-white font-medium text-ink-gray-9'
              : 'text-ink-gray-6 hover:bg-surface-gray-2'
          "
          @click="goTo(step.uid)"
        >
          <span class="w-5 text-center text-xs text-ink-gray-5">{{ index + 1 }}</span>
          <span class="truncate">{{ step.step_name || step.step_id || 'Untitled step' }}</span>
        </button>
      </nav>

      <!-- current step panel -->
      <div v-if="currentStep" class="flex min-w-0 flex-1 flex-col overflow-auto">
        <!-- Not flex-1: short tabs (General, Logic & Rules) have few fields,
             and stretching this to fill the scroll container left a large
             dead gap between the fields and the Prev/Next footer below. Let
             it size to content so the footer follows directly; any leftover
             space lands below the footer instead (a normal, un-alarming
             pattern — unlike floating actions with a gap above them). -->
        <div class="px-6 py-4">
          <StepInspector :step="currentStep" :is-as-is="isAsIs" />
        </div>

        <!-- navigation + add actions -->
        <div class="flex items-center gap-2 border-t border-outline-gray-1 px-6 py-3">
          <Button variant="subtle" :disabled="currentIndex <= 0" @click="goPrev">
            <template #prefix><FeatherIcon name="chevron-left" class="h-4 w-4" /></template>
            Prev
          </Button>
          <Button
            variant="subtle"
            :disabled="currentIndex >= steps.length - 1"
            @click="goNext"
          >
            Next
            <template #suffix><FeatherIcon name="chevron-right" class="h-4 w-4" /></template>
          </Button>
          <div class="ml-auto flex items-center gap-2">
            <Button v-if="isDecision" variant="subtle" @click="addBranch">
              <template #prefix><FeatherIcon name="git-branch" class="h-4 w-4" /></template>
              Add branch
            </Button>
            <Button variant="solid" @click="addNextStep">
              <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
              Add next step
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
