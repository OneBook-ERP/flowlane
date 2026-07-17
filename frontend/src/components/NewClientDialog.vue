<script setup>
// New Client dialog (S1). Creates a Flowlane Client; server conditions enforce
// unique name + email format, and their messages surface as an error toast.
import { ref, reactive, computed } from 'vue'
import { Dialog, Button, FormControl, toast } from 'frappe-ui'
import { masterOptions } from '@/data/masters.js'
import { createClient } from '@/data/clients.js'
import { serverMessage } from '@/data/errors.js'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'created'])

const saving = ref(false)
const form = reactive(blankForm())

const verticalOptions = computed(() => [
  { label: 'None', value: '' },
  ...masterOptions('industry_vertical'),
])
const statusOptions = ['Active', 'Prospect', 'Archived'].map((s) => ({ label: s, value: s }))

function blankForm() {
  return {
    client_name: '',
    industry_vertical: '',
    status: 'Active',
    primary_contact_name: '',
    primary_contact_email: '',
    notes: '',
  }
}

async function save() {
  if (!form.client_name.trim()) {
    toast.error('Client name is required.')
    return
  }
  saving.value = true
  try {
    const doc = await createClient({ ...form })
    toast.success(`Client "${doc.client_name}" created.`)
    Object.assign(form, blankForm())
    emit('created', doc)
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
    :options="{ title: 'New Client' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <div class="flex flex-col gap-3.5">
        <FormControl
          label="Client Name"
          type="text"
          v-model="form.client_name"
          placeholder="Acme Ltd"
          required
        />
        <FormControl
          label="Industry Vertical"
          type="select"
          :options="verticalOptions"
          v-model="form.industry_vertical"
        />
        <FormControl label="Status" type="select" :options="statusOptions" v-model="form.status" />
        <FormControl
          label="Primary Contact Name"
          type="text"
          v-model="form.primary_contact_name"
        />
        <FormControl
          label="Primary Contact Email"
          type="email"
          v-model="form.primary_contact_email"
        />
        <FormControl label="Notes" type="textarea" v-model="form.notes" />
      </div>
    </template>
    <template #actions>
      <Button variant="solid" :loading="saving" @click="save">Create Client</Button>
    </template>
  </Dialog>
</template>
