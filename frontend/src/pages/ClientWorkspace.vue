<script setup>
// Client Workspace (S2): left hierarchy tree + right detail pane. Owns the tree
// resource for this client and every create/edit/delete/reorder mutation; the
// tree component only emits intent. All writes reload the tree so it stays truthful.
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, toast } from 'frappe-ui'
import {
  loadClientTree,
  deleteProcess,
  updateSubProcess,
  deleteSubProcess,
  deleteMap,
} from '@/data/tree.js'
import { moveItem, resequence } from '@/data/reorder.js'
import { serverMessage } from '@/data/errors.js'
import HierarchyTree from '@/components/HierarchyTree.vue'
import ProcessDialog from '@/components/ProcessDialog.vue'
import SubProcessDialog from '@/components/SubProcessDialog.vue'
import NewMapDialog from '@/components/NewMapDialog.vue'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'
import MapBadge from '@/components/MapBadge.vue'

const props = defineProps({ client: { type: String, required: true } })
const router = useRouter()

const tree = loadClientTree(props.client)
const selected = ref(null) // { node, level }

// Dialog state. `edit` carries the node when editing, null when creating.
const processDialog = reactive({ open: false, edit: null })
const subDialog = reactive({ open: false, parentProcess: '', edit: null })
const mapDialog = reactive({ open: false, subProcess: '', edit: null })
const deleteDialog = reactive({ open: false, message: '', run: null })
const busy = ref(false)

const processes = computed(() => tree.data?.processes || [])

function reload() {
  tree.reload()
}

// --- create / edit openers ------------------------------------------------

function newProcess() {
  processDialog.edit = null
  processDialog.open = true
}
function editProcess(process) {
  processDialog.edit = process
  processDialog.open = true
}
function newSub(process) {
  subDialog.parentProcess = process.name
  subDialog.edit = null
  subDialog.open = true
}
function editSub(sub) {
  subDialog.edit = sub
  subDialog.open = true
}
function newMap(sub) {
  mapDialog.subProcess = sub.name
  mapDialog.edit = null
  mapDialog.open = true
}
function editMap(map) {
  mapDialog.edit = map
  mapDialog.open = true
}

// A freshly created map opens straight in the editor (stub); edits just reload.
function onMapSaved(doc) {
  reload()
  if (doc) openMap(doc)
}

function openMap(map) {
  router.push({ name: 'Editor', params: { map: map.name } })
}

// --- delete (with server guard messages) ----------------------------------

function askDelete(message, run) {
  deleteDialog.message = message
  deleteDialog.run = run
  deleteDialog.open = true
}

function deleteProcessNode(process) {
  askDelete(`Delete process “${process.process_name}”?`, () => deleteProcess(process.name))
}
function deleteSubNode(sub) {
  askDelete(`Delete sub process “${sub.title}”?`, () => deleteSubProcess(sub.name))
}
function deleteMapNode(map) {
  askDelete(`Delete map “${map.map_title}”? Its steps are removed too.`, () =>
    deleteMap(map.name)
  )
}

async function runDelete() {
  busy.value = true
  try {
    await deleteDialog.run()
    toast.success('Deleted.')
    selected.value = null
    deleteDialog.open = false
    reload()
  } catch (error) {
    toast.error(serverMessage(error))
    deleteDialog.open = false
  } finally {
    busy.value = false
  }
}

// --- reorder sub processes ------------------------------------------------

async function moveSub({ process, sub, direction }) {
  const current = process.sub_processes
  const from = current.findIndex((s) => s.name === sub.name)
  const reordered = moveItem(current, from, from + direction)
  const changes = resequence(reordered)
  if (!changes.length) return
  try {
    await Promise.all(changes.map((c) => updateSubProcess(c.name, { sequence: c.sequence })))
    reload()
  } catch (error) {
    toast.error(serverMessage(error))
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center gap-3 border-b border-outline-gray-1 px-6 py-3">
      <Button variant="ghost" @click="router.push({ name: 'Home' })">← Clients</Button>
      <h1 class="text-lg font-semibold text-ink-gray-9">
        {{ tree.data?.client_name || client }}
      </h1>
      <span v-if="tree.data?.industry_vertical" class="text-sm text-ink-gray-5">
        {{ tree.data.industry_vertical }}
      </span>
      <Button class="ml-auto" variant="solid" @click="newProcess">New Process</Button>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Tree -->
      <aside class="w-80 shrink-0 overflow-y-auto border-r border-outline-gray-1 p-3">
        <p
          v-if="!processes.length"
          class="px-2 py-6 text-center text-sm text-ink-gray-5"
        >
          No processes yet. Use “New Process”.
        </p>
        <HierarchyTree
          v-else
          :processes="processes"
          :selected-name="selected?.node?.name || ''"
          @select="selected = $event"
          @open-map="openMap"
          @new-sub="newSub"
          @edit-process="editProcess"
          @delete-process="deleteProcessNode"
          @new-map="newMap"
          @edit-sub="editSub"
          @delete-sub="deleteSubNode"
          @move-sub="moveSub"
          @edit-map="editMap"
          @delete-map="deleteMapNode"
        />
      </aside>

      <!-- Detail pane -->
      <section class="flex-1 overflow-y-auto p-8">
        <div v-if="!selected" class="text-sm text-ink-gray-5">
          Select a process, sub process, or map to see its details.
        </div>

        <div v-else-if="selected.level === 'map'" class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-semibold text-ink-gray-9">{{ selected.node.map_title }}</h2>
            <MapBadge :map-type="selected.node.map_type" />
          </div>
          <dl class="grid grid-cols-2 gap-y-2 text-sm">
            <dt class="text-ink-gray-5">Direction</dt>
            <dd class="text-ink-gray-8">{{ selected.node.direction }}</dd>
            <dt class="text-ink-gray-5">Status</dt>
            <dd class="text-ink-gray-8">{{ selected.node.status }}</dd>
            <dt class="text-ink-gray-5">Version</dt>
            <dd class="text-ink-gray-8">{{ selected.node.version_label }}</dd>
          </dl>
          <Button class="w-fit" variant="solid" @click="openMap(selected.node)">
            Open Editor
          </Button>
        </div>

        <div v-else-if="selected.level === 'sub'" class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold text-ink-gray-9">{{ selected.node.title }}</h2>
          <p class="text-sm text-ink-gray-7">
            {{ selected.node.description || 'No description.' }}
          </p>
          <Button class="w-fit" variant="subtle" @click="newMap(selected.node)">Add Map</Button>
        </div>

        <div v-else class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold text-ink-gray-9">{{ selected.node.process_name }}</h2>
          <dl class="grid grid-cols-2 gap-y-2 text-sm">
            <dt class="text-ink-gray-5">Value Stream</dt>
            <dd class="text-ink-gray-8">{{ selected.node.value_stream || '—' }}</dd>
            <dt class="text-ink-gray-5">Category</dt>
            <dd class="text-ink-gray-8">{{ selected.node.category || '—' }}</dd>
            <dt class="text-ink-gray-5">Status</dt>
            <dd class="text-ink-gray-8">{{ selected.node.status }}</dd>
          </dl>
          <Button class="w-fit" variant="subtle" @click="newSub(selected.node)">
            Add Sub Process
          </Button>
        </div>
      </section>
    </div>

    <!-- Dialogs -->
    <ProcessDialog
      v-model="processDialog.open"
      :client="client"
      :edit="processDialog.edit"
      @saved="reload"
    />
    <SubProcessDialog
      v-model="subDialog.open"
      :parent-process="subDialog.parentProcess || subDialog.edit?.parent_process || ''"
      :edit="subDialog.edit"
      @saved="reload"
    />
    <NewMapDialog
      v-model="mapDialog.open"
      :sub-process="mapDialog.subProcess || mapDialog.edit?.sub_process || ''"
      :edit="mapDialog.edit"
      @saved="onMapSaved"
    />
    <ConfirmDeleteDialog
      v-model="deleteDialog.open"
      title="Confirm Delete"
      :message="deleteDialog.message"
      :saving="busy"
      @confirm="runDelete"
    />
  </div>
</template>
