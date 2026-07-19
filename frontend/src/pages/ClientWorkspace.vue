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
import { Button, FeatherIcon, toast } from 'frappe-ui'
import MapBadge from '@/components/MapBadge.vue'
import StatusChip from '@/components/StatusChip.vue'
import { statusChip } from '@/ui/chipColors.js'
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
import ClientSummary from '@/components/workspace/ClientSummary.vue'
import MapWorkspace from '@/components/editor/MapWorkspace.vue'
import ProcessDialog from '@/components/ProcessDialog.vue'
import SubProcessDialog from '@/components/SubProcessDialog.vue'
import NewMapDialog from '@/components/NewMapDialog.vue'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'

const props = defineProps({ client: { type: String, required: true } })
const route = useRoute()
const router = useRouter()

const tree = loadClientTree(props.client)
// Identity only ({level, name}) — NOT the node object itself. A mutation
// (add/edit/delete sub-process or map) calls reload(), which replaces
// tree.data wholesale; a raw object reference captured at select-time would
// go stale and the detail pane would keep showing pre-mutation data even
// though the toast says the change succeeded (found live: adding a second
// sub process to an already-selected process didn't appear until the user
// re-clicked it). `selected` below re-resolves this against the current
// `processes` on every read instead, so it can never go stale.
const selectedKey = ref(null)
const railCollapsed = ref(false)

// Dialog state. `edit` carries the node when editing, null when creating.
const processDialog = reactive({ open: false, edit: null })
const subDialog = reactive({ open: false, parentProcess: '', edit: null })
const mapDialog = reactive({ open: false, subProcess: '', edit: null })
const deleteDialog = reactive({ open: false, message: '', run: null })
const busy = ref(false)

const processes = computed(() => tree.data?.processes || [])
const activeMap = computed(() => route.query.map || null)

// Re-look-up the selected process/sub by name against the live `processes`
// tree on every access — see selectedKey's comment above.
const selected = computed(() => {
  if (!selectedKey.value) return null
  const { level, name } = selectedKey.value
  if (level === 'sub') {
    for (const process of processes.value) {
      const sub = process.sub_processes.find((s) => s.name === name)
      if (sub) return { level, node: sub }
    }
    return null
  }
  const process = processes.value.find((p) => p.name === name)
  return process ? { level, node: process } : null
})

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
  selectedKey.value = { level: node.level, name: node.node.name }
  clearActiveMap()
}

function crumbClick(crumb) {
  if (crumb.level === 'map') return // already active, nothing to do
  selectedKey.value = { level: crumb.level, name: crumb.node.name }
  clearActiveMap()
}

function goHome() {
  selectedKey.value = null
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
    selectedKey.value = null
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

      <!-- Process / sub-process detail (no map selected, UI-REVAMP D3): a
           compact header strip of inline key-values/chips instead of a whole
           page, with the body doing real work — the children list — rather
           than sitting empty below three rows on white. -->
      <section v-else class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ClientSummary
          v-if="!selected"
          :client="client"
          :client-name="tree.data?.client_name || client"
          :processes="processes"
        />

        <template v-else-if="selected.level === 'sub'">
          <div class="flex items-center gap-3 border-b border-outline-gray-1 px-6 py-3">
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-base font-semibold text-ink-gray-9">
                {{ selected.node.title }}
              </h2>
              <p v-if="selected.node.description" class="truncate text-xs text-ink-gray-5">
                {{ selected.node.description }}
              </p>
            </div>
            <span class="shrink-0 text-xs text-ink-gray-5">
              {{ selected.node.maps.length }} {{ selected.node.maps.length === 1 ? 'map' : 'maps' }}
            </span>
            <Button variant="solid" size="sm" @click="newMap(selected.node)">
              <template #prefix><FeatherIcon name="plus" class="h-3.5 w-3.5" /></template>
              Add Map
            </Button>
          </div>
          <div class="flex-1 overflow-y-auto p-3">
            <p v-if="!selected.node.maps.length" class="py-10 text-center text-sm text-ink-gray-5">
              No maps yet. Add one to start capturing this sub process.
            </p>
            <div v-else class="flex flex-col gap-0.5">
              <button
                v-for="map in selected.node.maps"
                :key="map.name"
                class="flex h-9 items-center gap-2 rounded px-3 text-left text-sm hover:bg-surface-gray-2"
                @click="openMap(map)"
              >
                <FeatherIcon name="git-branch" class="h-3.5 w-3.5 shrink-0 text-ink-gray-5" />
                <span class="min-w-0 flex-1 truncate text-ink-gray-8">{{ map.map_title }}</span>
                <MapBadge :map-type="map.map_type" />
                <span class="w-24 shrink-0 text-right">
                  <StatusChip :label="map.status" :classes="statusChip(map.status).classes" />
                </span>
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-outline-gray-1 px-6 py-3">
            <h2 class="text-base font-semibold text-ink-gray-9">{{ selected.node.process_name }}</h2>
            <span class="text-xs text-ink-gray-5">
              <span class="text-ink-gray-4">Value Stream</span> {{ selected.node.value_stream || '—' }}
            </span>
            <span class="text-xs text-ink-gray-5">
              <span class="text-ink-gray-4">Category</span> {{ selected.node.category || '—' }}
            </span>
            <StatusChip :label="selected.node.status" :classes="statusChip(selected.node.status).classes" />
            <Button class="ml-auto" variant="solid" size="sm" @click="newSub(selected.node)">
              <template #prefix><FeatherIcon name="plus" class="h-3.5 w-3.5" /></template>
              Add Sub Process
            </Button>
          </div>
          <div class="flex-1 overflow-y-auto p-3">
            <p v-if="!selected.node.sub_processes.length" class="py-10 text-center text-sm text-ink-gray-5">
              No sub processes yet. Add one to start breaking this process down.
            </p>
            <div v-else class="flex flex-col gap-0.5">
              <button
                v-for="sub in selected.node.sub_processes"
                :key="sub.name"
                class="flex h-9 items-center gap-2 rounded px-3 text-left text-sm hover:bg-surface-gray-2"
                @click="selectedKey = { level: 'sub', name: sub.name }"
              >
                <FeatherIcon name="folder" class="h-3.5 w-3.5 shrink-0 text-ink-gray-5" />
                <span class="min-w-0 flex-1 truncate text-ink-gray-8">{{ sub.title }}</span>
                <span class="w-20 shrink-0 text-right text-xs text-ink-gray-5">
                  {{ sub.maps.length }} {{ sub.maps.length === 1 ? 'map' : 'maps' }}
                </span>
              </button>
            </div>
          </div>
        </template>
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
