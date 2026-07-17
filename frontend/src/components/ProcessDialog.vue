<script setup>
// Process (L1) create/edit dialog (S3). `edit` prop (a process node) switches it
// to edit mode; otherwise it creates under `client`. Value stream & category
// dropdowns come from the seeded masters.
import { ref, reactive, computed, watch } from 'vue'
import { Dialog, Button, FormControl, toast } from 'frappe-ui'
import { masterOptions } from '@/data/masters.js'
import { createProcess, updateProcess } from '@/data/tree.js'
import { serverMessage } from '@/data/errors.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  client: { type: String, required: true },
  edit: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const saving = ref(false)
const form = reactive(blankForm())

const isEdit = computed(() => Boolean(props.edit))
const valueStreamOptions = computed(() => withNone(masterOptions('value_stream')))
const categoryOptions = computed(() => withNone(masterOptions('category')))
const statusOptions = ['Draft', 'In Review', 'Approved'].map((s) => ({ label: s, value: s }))

watch(
  () => props.modelValue,
  (open) => {
    if (open) Object.assign(form, props.edit ? fromNode(props.edit) : blankForm())
  }
)

function blankForm() {
  return { process_name: '', value_stream: '', category: '', status: 'Draft' }
}

function fromNode(node) {
  return {
    process_name: node.process_name || '',
    value_stream: node.value_stream || '',
    category: node.category || '',
    status: node.status || 'Draft',
  }
}

function withNone(options) {
  return [{ label: 'None', value: '' }, ...options]
}

async function save() {
  if (!form.process_name.trim()) {
    toast.error('Process name is required.')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateProcess(props.edit.name, { ...form })
      toast.success('Process updated.')
    } else {
      await createProcess({ client: props.client, ...form })
      toast.success(`Process "${form.process_name}" created.`)
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
    :options="{ title: isEdit ? 'Edit Process' : 'New Process' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <div class="flex flex-col gap-3.5">
        <FormControl
          label="Process Name"
          type="text"
          v-model="form.process_name"
          placeholder="Quote-to-Cash"
          required
        />
        <FormControl
          label="Value Stream"
          type="select"
          :options="valueStreamOptions"
          v-model="form.value_stream"
        />
        <FormControl
          label="Category"
          type="select"
          :options="categoryOptions"
          v-model="form.category"
        />
        <FormControl label="Status" type="select" :options="statusOptions" v-model="form.status" />
      </div>
    </template>
    <template #actions>
      <Button variant="solid" :loading="saving" @click="save">
        {{ isEdit ? 'Save' : 'Create Process' }}
      </Button>
    </template>
  </Dialog>
</template>
