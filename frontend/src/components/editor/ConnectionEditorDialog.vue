<script setup>
// Per-step connection editor (T2.4). Lists this step's outgoing edges; each edge
// picks a target step (any other row in the same map) and an optional label
// (e.g. a Decision's "Yes" / "No") + condition. Targets are referenced by row uid
// so the server only ever stores in-map edges. Mutations go through the store.
import { computed } from 'vue'
import { Dialog, Button, FormControl, Combobox, FeatherIcon } from 'frappe-ui'
import { useMapStore } from '@/stores/useMapStore.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  uid: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const store = useMapStore()
const step = computed(() => store.findStep(props.uid))

// Every other row is a valid target; label it by step_id + name for the picker.
const targetOptions = computed(() =>
  store.state.steps
    .filter((row) => row.uid !== props.uid)
    .map((row) => ({
      value: row.uid,
      label: `${row.step_id || '?'} — ${row.step_name || 'Untitled'}`,
    }))
)

const connections = computed(() => step.value?.connections || [])

function title() {
  const current = step.value
  if (!current) return 'Connections'
  return `Connections — ${current.step_id || 'Step'}`
}
</script>

<template>
  <Dialog
    :modelValue="modelValue"
    :options="{ title: title(), size: 'xl' }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #body-content>
      <div v-if="step" class="flex flex-col gap-3">
        <p v-if="!connections.length" class="py-4 text-center text-sm text-ink-gray-5">
          No connections yet. Add one to link this step to another.
        </p>

        <div
          v-for="(conn, index) in connections"
          :key="index"
          class="flex items-end gap-2 rounded border border-outline-gray-1 p-2"
        >
          <div class="flex-1">
            <label class="mb-1 block text-xs text-ink-gray-5">Target step</label>
            <Combobox
              :options="targetOptions"
              :modelValue="conn.to_uid"
              placeholder="Select target"
              @update:modelValue="store.setConnection(uid, index, { to_uid: $event })"
            />
          </div>
          <FormControl
            class="w-32"
            type="text"
            label="Label"
            :modelValue="conn.label"
            placeholder="Yes / No"
            @update:modelValue="store.setConnection(uid, index, { label: $event })"
          />
          <FormControl
            class="flex-1"
            type="text"
            label="Condition"
            :modelValue="conn.condition"
            @update:modelValue="store.setConnection(uid, index, { condition: $event })"
          />
          <Button variant="ghost" @click="store.removeConnection(uid, index)">
            <template #icon><FeatherIcon name="trash-2" class="h-4 w-4 text-ink-red-3" /></template>
          </Button>
        </div>

        <Button class="w-fit" variant="subtle" @click="store.addConnection(uid)">
          <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
          Add connection
        </Button>
      </div>
    </template>
    <template #actions>
      <Button variant="solid" @click="emit('update:modelValue', false)">Done</Button>
    </template>
  </Dialog>
</template>
