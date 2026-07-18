<script setup>
// Client Workspace (S2) — the unified workspace shell (UI step U2: B2/B3/B4).
// Persistent top bar (breadcrumb + As-Is/To-Be badge + Saved/Export slot) and
// tree rail sit alongside the center pane; selecting an L3 map in the tree
// loads it inline via MapWorkspace — there is no more "Open Editor" page
// (B3). The active map is carried in `?map=` on this same route so tree
// state (scroll/expand) survives switching maps; `/m/:map` deep links land
// here through MapEditor.vue's redirect (see router.js + CONVENTIONS.md).
//
// This page still owns the tree resource and every create/edit/delete/reorder
// mutation, same as before the reshell — only the layout and map-open flow
// changed. The Map Step store itself is created one level down, inside
// MapWorkspace (keyed by map name), and is untouched.
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { breadcrumbTrail, findMapContext, findProcessForSub } from '@/workspace/treeContext.js'
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar.vue'
import TreeRail from '@/components/workspace/TreeRail.vue'
import MapWorkspace from '@/components/editor/MapWorkspace.vue'
import ProcessDialog from '@/components/ProcessDialog.vue'
import SubProcessDialog from '@/components/SubProcessDialog.vue'
import NewMapDialog from '@/components/NewMapDialog.vue'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'

const props = defineProps({ client: { type: String, required: true } })
const route = useRoute()
const router = useRouter()

const tree = loadClientTree(props.client)
const selected = ref(null) // { node, level } — process/sub only; a map is `activeMap`
const railCollapsed = ref(false)

// Dialog state. `edit` carries the node when editing, null when creating.
const processDialog = reactive({ open: false, edit: null })
const subDialog = reactive({ open: false, parentProcess: '', edit: null })
const mapDialog = reactive({ open: false, subProcess: '', edit: null })
const deleteDialog = reactive({ open: false, message: '', run: null })
const busy = ref(false)

const processes = computed(() => tree.data?.processes || [])
const activeMap = computed(() => route.query.map || null)
const selectedName = computed(() => activeMap.value || selected.value?.node?.name || '')
const crumbs = computed(() =>
  breadcrumbTrail(processes.value, { mapName: activeMap.value, selected: selected.value })
)
// Reveal a deep-linked (or tree-clicked) map's ancestors even before the user
// has expanded them by hand.
const autoExpandNames = computed(() => {
  if (activeMap.value) {
    const ctx = findMapContext(processes.value, activeMap.value)
    return ctx ? [ctx.process.name, ctx.sub.name] : []
  }
  if (selected.value?.level === 'sub') {
    const process = findProcessForSub(processes.value, selected.value.node.name)
    return process ? [process.name] : []
  }
  return []
})

function reload() {
  tree.reload()
}

// --- navigation: open/close the inline map pane ---------------------------

function openMap(map) {
  router.push({ name: 'ClientWorkspace', params: { client: props.client }, query: { map: map.name } })
}

function clearActiveMap() {
  if (route.query.map) {
    router.replace({ name: 'ClientWorkspace', params: { client: props.client }, query: {} })
  }
}

function selectNode(node) {
  // Clicking a map opens it directly — no intermediate detail page (B3).
  if (node.level === 'map') {
    openMap(node.node)
    return
  }
  selected.value = node
  clearActiveMap()
}

function crumbClick(crumb) {
  if (crumb.level === 'map') return // already active, nothing to do
  selected.value = { level: crumb.level, node: crumb.node }
  clearActiveMap()
}

function goHome() {
  selected.value = null
  clearActiveMap()
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

// A freshly created map opens straight in the editor; edits just reload.
function onMapSaved(doc) {
  reload()
  if (doc) openMap(doc)
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
    clearActiveMap()
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
    <WorkspaceTopBar
      :client-name="tree.data?.client_name || client"
      :crumbs="crumbs"
      @home="goHome"
      @crumb-click="crumbClick"
    />

    <div class="flex flex-1 overflow-hidden">
      <TreeRail
        :processes="processes"
        :selected-name="selectedName"
        :auto-expand="autoExpandNames"
        v-model:collapsed="railCollapsed"
        @new-process="newProcess"
        @select="selectNode"
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

      <!-- Inline map editor: Table / Diagram / Wizard tabs + inspector (B2/B3). -->
      <div v-if="activeMap" id="editor-tabs" class="flex min-w-0 flex-1 overflow-hidden">
        <MapWorkspace :key="activeMap" :map="activeMap" />
      </div>

      <!-- Process / sub-process detail (no map selected). -->
      <section v-else class="flex-1 overflow-y-auto p-8">
        <div v-if="!selected" class="text-sm text-ink-gray-5">
          Select a process, sub process, or map to see its details.
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
