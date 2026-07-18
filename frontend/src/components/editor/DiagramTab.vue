<script setup>
// Diagram tab (S9): the live, generated swimlane (PLAN §10, F12–F15). Reads the
// shared Map Step store, maps each row onto the pure engine's contract, and
// renders the result as SVG — lane bands, node shapes by Node Type, directional
// arrows and branch labels. The engine owns all geometry; this component only
// draws it, plus the TB<->LR toggle, drag-to-override, auto-arrange (clear
// overrides), click-a-node detail panel, and thumbnail-on-save.
//
// Engine identity: we pass each row's stable `uid` as the engine `step_id` (the
// "uid form" the engine accepts) and translate connections' `to_uid` straight
// through as `to_step_id`. No uid->step_id table is needed; the visible label
// carries the human step_id / step_name.
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Button, FeatherIcon, Tooltip, call } from 'frappe-ui'
import { useMapStore } from '@/stores/useMapStore.js'
import { diagramMeta, nodeShapeMap, laneOrderMap } from '@/data/diagramMeta.js'
import { generateSwimlane } from '@/diagram/generateSwimlane.js'
import { shapeGeometry, pointsAttr } from '@/diagram/nodeShapes.js'
import { svgToPng } from '@/diagram/thumbnail.js'
import DiagramNodePanel from './DiagramNodePanel.vue'
import ExportMenu from './ExportMenu.vue'

const store = useMapStore()
const svgRef = ref(null)
const empty = { lanes: [], nodes: [], edges: [], width: 0, height: 0, direction: 'TB' }
const diagram = ref(empty)
const drag = ref(null) // { uid, x, y } live position while dragging
const selectedUid = ref('') // node whose detail panel is open

const selectedStep = computed(() => store.findStep(selectedUid.value) || null)
const hasManual = computed(() =>
  store.state.steps.some((s) => s.manual_x !== null || s.manual_y !== null)
)

const direction = computed(() =>
  store.state.header.direction === 'Left-to-Right' ? 'LR' : 'TB'
)
const hasSteps = computed(() => store.state.steps.length > 0)

// Pain-point count per node (keyed by the engine step_id == row uid) so the
// diagram can flag As-Is issues without touching the pure engine's contract.
const painCounts = computed(() => {
  const counts = {}
  store.state.steps.forEach((row) => {
    const n = (row.pain_points || []).length
    if (n) counts[row.uid] = n
  })
  return counts
})

const getSvg = () => svgRef.value

// Store rows -> engine input (uid form, shape resolved from the node-type map).
const engineSteps = computed(() => {
  const shapes = nodeShapeMap()
  return store.state.steps.map((row) => ({
    step_id: row.uid,
    step_name: row.step_name,
    label: labelFor(row),
    lane_role: row.lane_role,
    node_type: row.node_type,
    shape: shapes[row.node_type],
    manual_x: row.manual_x,
    manual_y: row.manual_y,
    connections: (row.connections || []).map((conn) => ({
      to_step_id: conn.to_uid,
      label: conn.label,
    })),
  }))
})

// Nodes with the live drag position layered on top for smooth feedback.
const displayNodes = computed(() =>
  diagram.value.nodes.map((node) =>
    drag.value && drag.value.uid === node.step_id
      ? { ...node, x: drag.value.x, y: drag.value.y }
      : node
  )
)

onMounted(() => {
  if (!diagramMeta.data) diagramMeta.fetch()
})

// --- regeneration (throttled to animation frames, T3.4/T3.5) --------------

let rafId = null
function scheduleRegenerate() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    diagram.value = generateSwimlane(engineSteps.value, direction.value, {
      laneOrder: laneOrderMap(),
    })
  })
}

watch(
  [engineSteps, direction, () => diagramMeta.data],
  scheduleRegenerate,
  { immediate: true }
)

// --- direction toggle (T3.6) ----------------------------------------------

function toggleDirection() {
  const next = direction.value === 'TB' ? 'Left-to-Right' : 'Top-to-Bottom'
  store.setDirection(next)
}

// --- drag to override position (T3.7) -------------------------------------

// One handler for both gestures: a press that barely moves is a click (open the
// detail panel); a press that drags past the threshold repositions the node.
function onPointerDown(event, node) {
  event.target.setPointerCapture?.(event.pointerId)
  const start = toSvgPoint(event)
  const origin = { x: node.x, y: node.y }
  let moved = false

  const move = (e) => {
    const p = toSvgPoint(e)
    if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 4) return
    moved = true
    drag.value = { uid: node.step_id, x: origin.x + (p.x - start.x), y: origin.y + (p.y - start.y) }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (moved && drag.value) commitDrag(drag.value)
    else selectedUid.value = node.step_id
    drag.value = null
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// Persist the dropped position; the store schedules the autosave that writes
// manual_x/manual_y, and the next regenerate respects the override.
function commitDrag(pos) {
  store.setField(pos.uid, 'manual_x', Math.round(pos.x))
  store.setField(pos.uid, 'manual_y', Math.round(pos.y))
}

// Clear every manual override so the engine re-flows from scratch (F14).
function autoArrange() {
  store.state.steps.forEach((step) => {
    if (step.manual_x !== null) store.setField(step.uid, 'manual_x', null)
    if (step.manual_y !== null) store.setField(step.uid, 'manual_y', null)
  })
}

function toSvgPoint(event) {
  const ctm = svgRef.value.getScreenCTM()
  if (!ctm) return { x: event.clientX, y: event.clientY }
  const inverse = ctm.inverse()
  return {
    x: inverse.a * event.clientX + inverse.c * event.clientY + inverse.e,
    y: inverse.b * event.clientX + inverse.d * event.clientY + inverse.f,
  }
}

// --- thumbnail on save (T3.8) ---------------------------------------------

let thumbTimer = null
watch(
  () => store.state.saving,
  (now, was) => {
    if (was && !now && !store.state.error) scheduleThumbnail()
  }
)

function scheduleThumbnail() {
  if (thumbTimer) clearTimeout(thumbTimer)
  thumbTimer = setTimeout(captureThumbnail, 400)
}

async function captureThumbnail() {
  if (!svgRef.value || !hasSteps.value) return
  try {
    const png = await svgToPng(svgRef.value)
    await call('flowlane.api.map.set_thumbnail', { map: store.mapName, png })
  } catch (error) {
    // Thumbnail is best-effort chrome; never block the editor on it.
  }
}

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (thumbTimer) clearTimeout(thumbTimer)
})

// --- render helpers -------------------------------------------------------

function labelFor(row) {
  const id = row.step_id ? `${row.step_id} · ` : ''
  const text = `${id}${row.step_name || 'Untitled'}`
  return text.length > 24 ? `${text.slice(0, 23)}…` : text
}

function bandRect(lane) {
  return direction.value === 'TB'
    ? { x: lane.pos, y: 0, width: lane.size, height: diagram.value.height }
    : { x: 0, y: lane.pos, width: diagram.value.width, height: lane.size }
}

// The lane-label header: the flow-start slice of the band (top for TB, left for LR).
function labelStrip(lane) {
  const gutter = diagram.value.labelGutter
  return direction.value === 'TB'
    ? { x: lane.pos, y: 0, width: lane.size, height: gutter }
    : { x: 0, y: lane.pos, width: gutter, height: lane.size }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- toolbar -->
    <div class="flex items-center gap-2 border-b border-outline-gray-1 px-4 py-2">
      <Tooltip text="Toggle flow direction (Top-to-Bottom / Left-to-Right)">
        <Button variant="subtle" @click="toggleDirection">
          <template #prefix>
            <FeatherIcon
              :name="direction === 'TB' ? 'arrow-down' : 'arrow-right'"
              class="h-4 w-4"
            />
          </template>
          {{ direction === 'TB' ? 'Top-to-Bottom' : 'Left-to-Right' }}
        </Button>
      </Tooltip>
      <Tooltip text="Clear manual positions and auto-lay out">
        <Button variant="subtle" :disabled="!hasManual" @click="autoArrange">
          <template #prefix><FeatherIcon name="grid" class="h-4 w-4" /></template>
          Auto-arrange
        </Button>
      </Tooltip>
      <p class="text-xs text-ink-gray-5">
        Click a node for details · drag to reposition
      </p>
      <div class="ml-auto flex items-center gap-3">
        <ExportMenu
          :get-svg="getSvg"
          :title="store.state.header.map_title || 'flowlane-map'"
          :disabled="!hasSteps"
        />
        <span class="text-xs text-ink-gray-5">
          {{ store.state.saving ? 'Saving…' : store.state.dirty ? 'Unsaved changes' : 'All changes saved' }}
        </span>
      </div>
    </div>

    <!-- canvas (scrolls) with a fixed detail overlay on the right -->
    <div class="relative min-h-0 flex-1">
      <div class="h-full overflow-auto bg-surface-gray-1 p-4">
      <p
        v-if="store.state.loading"
        class="px-4 py-10 text-center text-sm text-ink-gray-5"
      >
        Loading diagram…
      </p>
      <p
        v-else-if="!hasSteps"
        class="px-4 py-10 text-center text-sm text-ink-gray-5"
      >
        No steps yet. Add rows in the Table tab and the swimlane appears here.
      </p>
      <svg
        v-else
        ref="svgRef"
        :width="diagram.width"
        :height="diagram.height"
        :viewBox="`0 0 ${diagram.width} ${diagram.height}`"
        class="rounded border border-outline-gray-1 bg-white"
      >
        <defs>
          <marker
            id="fl-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
          </marker>
        </defs>

        <!-- lane bands -->
        <g v-for="lane in diagram.lanes" :key="`lane-${lane.index}`">
          <rect
            v-bind="bandRect(lane)"
            :fill="lane.index % 2 === 0 ? '#f8fafc' : '#f1f5f9'"
            stroke="#e2e8f0"
            stroke-width="1"
          />
          <!-- label header strip at the flow start -->
          <rect
            v-bind="labelStrip(lane)"
            fill="#e2e8f0"
            stroke="#cbd5e1"
            stroke-width="1"
          />
          <text
            :x="lane.labelX"
            :y="lane.labelY"
            fill="#334155"
            font-size="11"
            font-weight="600"
            :text-anchor="direction === 'TB' ? 'middle' : 'start'"
            dominant-baseline="middle"
          >
            {{ lane.role || 'Unassigned' }}
          </text>
        </g>

        <!-- edges -->
        <g v-for="(edge, i) in diagram.edges" :key="`edge-${i}`">
          <polyline
            :points="pointsAttr(edge.points)"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1.5"
            marker-end="url(#fl-arrow)"
          />
          <text
            v-if="edge.label"
            :x="edge.labelX"
            :y="edge.labelY - 4"
            fill="#475569"
            font-size="11"
            text-anchor="middle"
          >
            {{ edge.label }}
          </text>
        </g>

        <!-- nodes -->
        <g
          v-for="node in displayNodes"
          :key="node.step_id"
          class="cursor-move"
          @pointerdown="onPointerDown($event, node)"
        >
          <template v-for="geo in [shapeGeometry(node)]">
            <ellipse
              v-if="geo.kind === 'ellipse'"
              :key="`s-${node.step_id}`"
              :cx="geo.cx"
              :cy="geo.cy"
              :rx="geo.rx"
              :ry="geo.ry"
              fill="#ffffff"
              stroke="#475569"
              stroke-width="1.5"
            />
            <polygon
              v-else-if="geo.kind === 'polygon'"
              :key="`s-${node.step_id}`"
              :points="pointsAttr(geo.points)"
              fill="#ffffff"
              stroke="#475569"
              stroke-width="1.5"
            />
            <rect
              v-else
              :key="`s-${node.step_id}`"
              :x="geo.x"
              :y="geo.y"
              :width="geo.width"
              :height="geo.height"
              :rx="geo.rx"
              fill="#ffffff"
              stroke="#475569"
              stroke-width="1.5"
            />
          </template>
          <text
            :x="node.x"
            :y="node.y"
            fill="#1e293b"
            font-size="11"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ node.label }}
          </text>
          <!-- pain-point badge: As-Is issues flagged on the node (T5.2/T5.3) -->
          <g v-if="painCounts[node.step_id]">
            <title>{{ painCounts[node.step_id] }} pain point(s)</title>
            <circle
              :cx="node.x + (node.w || 150) / 2 - 6"
              :cy="node.y - (node.h || 58) / 2 + 6"
              r="8"
              fill="#dc2626"
              stroke="#ffffff"
              stroke-width="1.5"
            />
            <text
              :x="node.x + (node.w || 150) / 2 - 6"
              :y="node.y - (node.h || 58) / 2 + 6"
              fill="#ffffff"
              font-size="9"
              font-weight="700"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ painCounts[node.step_id] }}
            </text>
          </g>
        </g>
      </svg>
      </div>

      <DiagramNodePanel
        :step="selectedStep"
        :steps="store.state.steps"
        @close="selectedUid = ''"
      />
    </div>
  </div>
</template>
