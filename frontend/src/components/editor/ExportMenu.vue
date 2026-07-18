<script setup>
// Export menu on the Diagram toolbar (T5.1, S10). Hands the live swimlane <svg>
// element (the SAME render path the tab draws) to the export helpers and downloads
// the result. `getSvg` returns the current element so we never hold a stale ref;
// the button disables when there is nothing to export.
import { ref } from 'vue'
import { Dropdown, Button, FeatherIcon, toast } from 'frappe-ui'
import { EXPORT_FORMATS, downloadBlob, exportFilename } from '@/diagram/exportDiagram.js'

const props = defineProps({
  getSvg: { type: Function, required: true },
  title: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const busy = ref(false)

const options = EXPORT_FORMATS.map((format) => ({
  label: format.label,
  onClick: () => runExport(format),
}))

async function runExport(format) {
  const svg = props.getSvg()
  if (!svg || busy.value) return
  busy.value = true
  try {
    const blob = await format.run(svg)
    downloadBlob(blob, exportFilename(props.title, format.ext))
    toast.success(`Exported ${format.label}`)
  } catch (error) {
    toast.error(`Export failed: ${error?.message || 'unknown error'}`)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dropdown :options="options">
    <Button variant="subtle" :loading="busy" :disabled="disabled" label="Export diagram">
      <template #prefix><FeatherIcon name="download" class="h-4 w-4" /></template>
      Export
      <template #suffix><FeatherIcon name="chevron-down" class="h-4 w-4" /></template>
    </Button>
  </Dropdown>
</template>
