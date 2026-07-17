<script setup>
// Delete confirmation. Blocked deletes (a process with sub processes, a client
// with processes) are enforced server-side; this only asks before we try, then
// the caller runs the delete and toasts any guard message that comes back.
import { Dialog, Button } from 'frappe-ui'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Delete' },
  message: { type: String, default: 'Are you sure? This cannot be undone.' },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <p class="text-p-base text-ink-gray-7">{{ message }}</p>
    </template>
    <template #actions>
      <Button variant="solid" theme="red" :loading="saving" @click="emit('confirm')">
        Delete
      </Button>
    </template>
  </Dialog>
</template>
