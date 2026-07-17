<script setup>
// Generic single-field rename dialog, reused for client / process / sub process /
// map. It only collects the new name and emits it; the caller runs the right
// rename call (rename_doc for the client, a title set_value for the others).
import { ref, watch } from 'vue'
import { Dialog, Button, FormControl } from 'frappe-ui'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Rename' },
  label: { type: String, default: 'Name' },
  value: { type: String, default: '' },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const draft = ref('')
watch(
  () => props.modelValue,
  (open) => {
    if (open) draft.value = props.value
  }
)

function submit() {
  const next = draft.value.trim()
  if (next && next !== props.value) emit('submit', next)
  else emit('update:modelValue', false)
}
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <FormControl :label="label" type="text" v-model="draft" @keyup.enter="submit" />
    </template>
    <template #actions>
      <Button variant="solid" :loading="saving" @click="submit">Save</Button>
    </template>
  </Dialog>
</template>
