<script setup>
// New Client dialog (S1). Creates a Flowlane Client; server conditions enforce
// unique name + email format, and their messages surface as an error toast.
//
// Optional onboarding-via-templates (additive, backward-compatible): picking
// "Modules in use" applies the matching Flowlane Process Template skeleton to
// the new client and then navigates straight into its workspace so the
// freshly-created tree is the first thing the user sees (the "instant win").
// Picking zero modules skips template application entirely and behaves
// exactly as before this feature existed — no navigation, dialog just closes.
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Button, FormControl, MultiSelect, toast } from 'frappe-ui'
import { masterOptions } from '@/data/masters.js'
import { createClient } from '@/data/clients.js'
import { applyTemplates, processTemplates } from '@/data/templates.js'
import { templatesForModules, summarizeApplyResult } from '@/data/templateSummary.js'
import { serverMessage } from '@/data/errors.js'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'created'])

const router = useRouter()

const saving = ref(false)
const form = reactive(blankForm())
const modules = ref([])

processTemplates.fetch()

const verticalOptions = computed(() => [
  { label: 'None', value: '' },
  ...masterOptions('industry_vertical'),
])
const statusOptions = ['Active', 'Prospect', 'Archived'].map((s) => ({ label: s, value: s }))
const moduleOptions = computed(() => masterOptions('erpnext_module'))
// What picking these modules will create, so the choice isn't a leap of faith.
const preview = computed(() => templatesForModules(processTemplates.data, modules.value))

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
    await applyTemplatesIfSelected(doc)
    resetAndClose(doc)
  } catch (error) {
    toast.error(serverMessage(error))
  } finally {
    saving.value = false
  }
}

async function applyTemplatesIfSelected(doc) {
  if (!modules.value.length) return
  try {
    const result = await applyTemplates(doc.name, modules.value)
    const summary = summarizeApplyResult(result)
    if (summary) toast.success(summary)
    router.push({ name: 'ClientWorkspace', params: { client: doc.name } })
  } catch (error) {
    // The client itself was created successfully; only the template skeleton
    // failed to apply. Surface it but don't block closing the dialog — the
    // consultant can still map from a blank tree.
    toast.error(serverMessage(error, 'Client created, but applying templates failed.'))
  }
}

function resetAndClose(doc) {
  Object.assign(form, blankForm())
  modules.value = []
  emit('created', doc)
  emit('update:modelValue', false)
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

        <div class="flex flex-col gap-1.5">
          <span class="text-sm text-ink-gray-5">Modules in use (optional)</span>
          <MultiSelect
            v-model="modules"
            :options="moduleOptions"
            placeholder="Select the ERPNext modules this client uses"
          />
          <p class="text-xs text-ink-gray-4">
            Starts the client from a standard process skeleton instead of a blank tree.
          </p>
          <ul v-if="preview.length" class="flex flex-col gap-1 rounded bg-surface-gray-1 p-2.5">
            <li
              v-for="template in preview"
              :key="template.name"
              class="text-xs text-ink-gray-6"
            >
              <span class="font-medium text-ink-gray-8">{{ template.process_name }}</span>
              — {{ template.sub_process_templates.map((s) => s.title).join(', ') }}
            </li>
          </ul>
        </div>
      </div>
    </template>
    <template #actions>
      <Button variant="solid" :loading="saving" @click="save">Create Client</Button>
    </template>
  </Dialog>
</template>
