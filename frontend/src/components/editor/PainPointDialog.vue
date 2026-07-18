<script setup>
// Per-step Pain Point dialog for the Table tab (T5.2) — mirrors
// ConnectionEditorDialog. Wraps the shared PainPointEditor so the Table and Wizard
// edit the exact same store rows through one editor component.
import { computed } from 'vue'
import { Dialog, Button } from 'frappe-ui'
import PainPointEditor from './PainPointEditor.vue'
import { useMapStore } from '@/stores/useMapStore.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  uid: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const store = useMapStore()
const step = computed(() => store.findStep(props.uid))

function title() {
  const current = step.value
  return current ? `Pain Points — ${current.step_id || 'Step'}` : 'Pain Points'
}
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title: title(), size: 'xl' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <PainPointEditor v-if="step" :step="step" />
    </template>
    <template #actions>
      <Button variant="solid" @click="emit('update:modelValue', false)">Done</Button>
    </template>
  </Dialog>
</template>
