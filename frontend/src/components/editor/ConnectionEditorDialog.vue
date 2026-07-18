<script setup>
// Modal wrapper around ConnectionsList — the Table row's "+ connection" entry
// point (T2.4). StepInspector's Connections tab (U3) mounts ConnectionsList
// directly (docked, no dialog); this is the other of its two hosts, so there
// remains one connection-editing pattern, not two.
import { computed } from 'vue'
import { Dialog, Button } from 'frappe-ui'
import ConnectionsList from './ConnectionsList.vue'
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
  return current ? `Connections — ${current.step_id || 'Step'}` : 'Connections'
}
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title: title(), size: 'xl' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <ConnectionsList :uid="uid" />
    </template>
    <template #actions>
      <Button variant="solid" @click="emit('update:modelValue', false)">Done</Button>
    </template>
  </Dialog>
</template>
