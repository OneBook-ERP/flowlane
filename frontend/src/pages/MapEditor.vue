<script setup>
// Map Editor deep-link resolver (S6, route `Editor` / `/m/:map`). UI step U2
// removed the standalone editor page (B2/B3): the actual editor now lives
// inline inside the workspace shell at `/c/:client?map=:map` (ClientWorkspace
// + MapWorkspace), so a map's tree/breadcrumb context is always on screen.
// This route stays as the bookmarkable/shareable entry point — it resolves
// the map's client via `get_map_location` and redirects into the shell.
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'frappe-ui'
import { getMapLocation } from '@/data/tree.js'
import { serverMessage } from '@/data/errors.js'

const props = defineProps({ map: { type: String, required: true } })
const router = useRouter()

onMounted(resolve)

async function resolve() {
  try {
    const { client } = await getMapLocation(props.map)
    router.replace({ name: 'ClientWorkspace', params: { client }, query: { map: props.map } })
  } catch (error) {
    toast.error(serverMessage(error))
    router.replace({ name: 'Home' })
  }
}
</script>

<template>
  <div class="flex h-full items-center justify-center text-sm text-ink-gray-5">
    Opening map…
  </div>
</template>
