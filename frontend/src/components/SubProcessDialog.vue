<script setup>
// Sub Process (L2) create/edit dialog (S4). Links to a process via `parent_process`
// (the fieldname is parent_process, not process). `sequence` is left to the server
// (before_insert auto-fills max+1) on create; edit preserves it.
import { ref, reactive, computed, watch } from 'vue'
import { Dialog, Button, FormControl, toast } from 'frappe-ui'
import { createSubProcess, updateSubProcess } from '@/data/tree.js'
import { serverMessage } from '@/data/errors.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  parentProcess: { type: String, required: true },
  edit: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const saving = ref(false)
const form = reactive(blankForm())
const isEdit = computed(() => Boolean(props.edit))

watch(
  () => props.modelValue,
  (open) => {
    if (open) Object.assign(form, props.edit ? fromNode(props.edit) : blankForm())
  }
)

function blankForm() {
  return { title: '', description: '' }
}

function fromNode(node) {
  return { title: node.title || '', description: node.description || '' }
}

async function save() {
  if (!form.title.trim()) {
    toast.error('Title is required.')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateSubProcess(props.edit.name, { ...form })
      toast.success('Sub process updated.')
    } else {
      await createSubProcess({ parent_process: props.parentProcess, ...form })
      toast.success(`Sub process "${form.title}" created.`)
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch (error) {
    toast.error(serverMessage(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title: isEdit ? 'Edit Sub Process' : 'New Sub Process' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <div class="flex flex-col gap-3.5">
        <FormControl
          label="Title"
          type="text"
          v-model="form.title"
          placeholder="Opportunity & Quotation"
          required
        />
        <FormControl label="Description" type="textarea" v-model="form.description" />
      </div>
    </template>
    <template #actions>
      <Button variant="solid" :loading="saving" @click="save">
        {{ isEdit ? 'Save' : 'Create Sub Process' }}
      </Button>
    </template>
  </Dialog>
</template>
