<script setup>
// New / edit Process Map dialog (S5). Creates an L3 map under a sub process,
// tagged As-Is | To-Be with a layout direction. On create the parent routes to
// the map editor (Phase-1 stub). `map_title` is optional — the server defaults it
// to "<sub process> — <map type>".
import { ref, reactive, computed, watch } from 'vue'
import { Dialog, Button, FormControl, toast } from 'frappe-ui'
import { createMap, updateMap } from '@/data/tree.js'
import { serverMessage } from '@/data/errors.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  subProcess: { type: String, required: true },
  edit: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const saving = ref(false)
const form = reactive(blankForm())
const isEdit = computed(() => Boolean(props.edit))

const mapTypeOptions = ['As-Is', 'To-Be'].map((v) => ({ label: v, value: v }))
const directionOptions = ['Top-to-Bottom', 'Left-to-Right'].map((v) => ({ label: v, value: v }))
const statusOptions = ['Draft', 'In Review', 'Approved'].map((v) => ({ label: v, value: v }))

watch(
  () => props.modelValue,
  (open) => {
    if (open) Object.assign(form, props.edit ? fromNode(props.edit) : blankForm())
  }
)

function blankForm() {
  return { map_title: '', map_type: 'As-Is', direction: 'Top-to-Bottom', status: 'Draft' }
}

function fromNode(node) {
  return {
    map_title: node.map_title || '',
    map_type: node.map_type || 'As-Is',
    direction: node.direction || 'Top-to-Bottom',
    status: node.status || 'Draft',
  }
}

async function save() {
  saving.value = true
  try {
    if (isEdit.value) {
      await updateMap(props.edit.name, { ...form })
      toast.success('Map updated.')
      emit('saved', null)
    } else {
      const doc = await createMap({ sub_process: props.subProcess, ...form })
      toast.success(`${doc.map_type} map created.`)
      emit('saved', doc)
    }
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
    :options="{ title: isEdit ? 'Edit Map' : 'New Map' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <div class="flex flex-col gap-3.5">
        <FormControl
          label="Map Title"
          type="text"
          v-model="form.map_title"
          placeholder="Defaults to “Sub process — As-Is”"
        />
        <FormControl
          label="Map Type"
          type="select"
          :options="mapTypeOptions"
          v-model="form.map_type"
          required
        />
        <FormControl
          label="Direction"
          type="select"
          :options="directionOptions"
          v-model="form.direction"
        />
        <FormControl label="Status" type="select" :options="statusOptions" v-model="form.status" />
      </div>
    </template>
    <template #actions>
      <Button variant="solid" :loading="saving" @click="save">
        {{ isEdit ? 'Save' : 'Create Map' }}
      </Button>
    </template>
  </Dialog>
</template>
