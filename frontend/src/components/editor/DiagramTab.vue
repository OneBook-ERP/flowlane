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
import { laneAtCross } from '@/diagram/laneHit.js'
import { svgToPng } from '@/diagram/thumbnail.js'
import { doctypes } from '@/data/erpnext.js'
import { nodeTypeColor, NODE_TYPE_NAMES } from '@/diagram/nodeColors.js'
import { severityChip, maxSeverity } from '@/ui/chipColors.js'
import { nodeIndicators } from '@/diagram/nodeIndicators.js'
import { laneTint } from '@/diagram/laneColors.js'
import {
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  chromeWidth,
  contentOffsetX,
  crumbText,
  metaText,
} from '@/diagram/diagramChrome.js'
import RisksStrip from './RisksStrip.vue'
import DiagramHeader from './DiagramHeader.vue'
import DiagramFooter from './DiagramFooter.vue'

const store = useMapStore()
const svgRef = ref(null)
const empty = { lanes: [], nodes: [], edges: [], width: 0, height: 0, direction: 'TB' }
const diagram = ref(empty)
const drag = ref(null) // { uid, x, y } live position while dragging
const selectedUid = ref('') // node whose detail (now in the shared Inspector) is open

const selectedStep = computed(() => store.findStep(selectedUid.value) || null)
const hasManual = computed(() =>
  store.state.steps.some((s) => s.manual_x !== null || s.manual_y !== null)
)

const direction = computed(() =>
  store.state.header.direction === 'Left-to-Right' ? 'LR' : 'TB'
)
const hasSteps = computed(() => store.state.steps.length > 0)

// Pain-point count + worst severity per node (keyed by the engine step_id ==
// row uid) so the diagram can flag pain points without touching the pure
// engine's contract. Severity drives the badge color (UI-REVAMP §3/§4) via
// the same chipColors.js every other severity chip in the app reads.
const painCounts = computed(() => {
  const counts = {}
  store.state.steps.forEach((row) => {
    const points = row.pain_points || []
    if (points.length) {
      counts[row.uid] = { count: points.length, severity: maxSeverity(points.map((p) => p.severity)) }
    }
  })
  return counts
})

// Detail indicators (UI step U6): a couple of high-signal fields (see
// diagram/nodeIndicators.js for the policy — pure and unit-tested there) get
// a tiny icon on the node so hidden StepInspector detail reads as "there's
// more here" without a full field-by-field canvas view. Keyed by engine
// step_id (== row uid), same pattern as painCounts above.
const nodeIndicatorsByStepId = computed(() => {
  const map = {}
  store.state.steps.forEach((row) => {
    const indicators = nodeIndicators(row)
    if (indicators.length) map[row.uid] = indicators
  })
  return map
})

// Layout for the indicator icons: a small row along the node's BOTTOM edge,
// right-aligned — deliberately the opposite corner from the pain-point badge
// (top-right) so the two never compete for the same pixels. Not pure (needs
// the node's live rendered x/y/w/h from the engine) so it stays here rather
// than in nodeIndicators.js.
const INDICATOR_SIZE = 10
const INDICATOR_GAP = 2
function indicatorLayout(node) {
  const list = nodeIndicatorsByStepId.value[node.step_id]
  if (!list) return []
  const w = node.w || 150
  const h = node.h || 58
  const rightEdge = node.x + w / 2 - 6
  const y = node.y + h / 2 - INDICATOR_SIZE - 4
  const totalWidth = list.length * INDICATOR_SIZE + (list.length - 1) * INDICATOR_GAP
  const startX = rightEdge - totalWidth
  return list.map((indicator, i) => ({
    ...indicator,
    x: startX + i * (INDICATOR_SIZE + INDICATOR_GAP),
    y,
  }))
}

// Node-type hue lookup by engine step_id (== row uid) — the SAME color
// source Table's GridCell dot and StepInspector's header dot use
// (diagram/nodeColors.js), so shape + color read as one vocabulary across
// Table, Diagram and the Inspector (UI-REVAMP §3).
const nodeHues = computed(() => {
  const hues = {}
  store.state.steps.forEach((row) => {
    hues[row.uid] = nodeTypeColor(row.node_type).hex
  })
  return hues
})

// Canvas chrome (BACKLOG 4.2): header/footer/legend wrap the engine's own
// lane geometry in one translated <g> rather than the engine (generateSwimlane.js)
// knowing anything about them — see diagram/diagramChrome.js for the pure
// sizing math. Because this is the SAME <svg> exportDiagram.js serializes,
// on-screen and exported output can never drift apart (PLAN G8).
const canvasWidth = computed(() => chromeWidth(diagram.value.width, NODE_TYPE_NAMES.length))
const canvasHeight = computed(() => HEADER_HEIGHT + diagram.value.height + FOOTER_HEIGHT)
const contentOffset = computed(() => contentOffsetX(canvasWidth.value, diagram.value.width))
const contentTransform = computed(
  () => `translate(${contentOffset.value}, ${HEADER_HEIGHT})`
)
const footerY = computed(() => HEADER_HEIGHT + diagram.value.height)

const headerCrumb = computed(() => crumbText(store.state.header))
const headerTitle = computed(() => store.state.header.map_title || 'Untitled Map')
const headerMeta = computed(() => metaText(store.state.header))

// "Generated by / date" — plain functions (not computed) so a re-render right
// before an export reflects the moment of export, not whenever the tab
// mounted. Reads the same `user_id` session cookie frappe-ui's own
// (package-private) sessionUser() helper does.
function generatedBy() {
  const cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
  const user = cookies.get('user_id')
  return user && user !== 'Guest' ? user : 'Unknown user'
}
function generatedDate() {
  return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const getSvg = () => svgRef.value

// The top bar's relocated Export control reads the live SVG through this
// (UI step U2/B4) — see MapTabs.vue's defineExpose bridge. `selectedStep`
// (a computed ref — auto-unwrapped through the exposed proxy the same way
// `activeTab` already is below) lets the clicked node's detail dock in the
// SAME right-column Inspector Map Settings uses (bug-fix follow-up: it used
// to be a separate floating overlay on the canvas, which is also what put it
// above the sticky Table header's z-index in an inconsistent, hard-to-read
// way) — MapTabs.vue forwards this reactively the same way it forwards
// activeTab. clearSelectedStep is a plain action, like getSvg.
defineExpose({
  getSvg,
  selectedStep,
  clearSelectedStep: () => (selectedUid.value = ''),
})

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
  // The Inspector's ERPNext Setup tab (shown when a node is selected here)
  // needs the DocType list; Table normally primes this first (it mounts by
  // default), but fetch defensively here too since a Diagram-selected step
  // is genuinely editable (UI step U3).
  if (!doctypes.data) doctypes.fetch()
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
// manual_x/manual_y, and the next regenerate respects the override. Dragging
// a node into a DIFFERENT lane band's cross-axis extent (x for TB, y for LR —
// see laneHit.js) now also reassigns lane_role, not just position — before
// this, a node dropped into another lane only moved visually and snapped
// straight back to its original lane on the next auto-arrange or reload.
function commitDrag(pos) {
  store.setField(pos.uid, 'manual_x', Math.round(pos.x))
  store.setField(pos.uid, 'manual_y', Math.round(pos.y))
  const cross = direction.value === 'TB' ? pos.x : pos.y
  const role = laneAtCross(diagram.value.lanes, cross)
  const step = store.findStep(pos.uid)
  if (role && step && role !== step.lane_role) {
    store.setField(pos.uid, 'lane_role', role)
  }
}

// Clear every manual override so the engine re-flows from scratch (F14).
function autoArrange() {
  store.state.steps.forEach((step) => {
    if (step.manual_x !== null) store.setField(step.uid, 'manual_x', null)
    if (step.manual_y !== null) store.setField(step.uid, 'manual_y', null)
  })
}

// Add Node (parity with Table's "Add Row" / Wizard's "Add first step" — the
// Diagram tab had no way to create a step at all). Selects it immediately so
// the Inspector opens for the new node, same as clicking any other node.
function addNode() {
  const step = store.addStep()
  selectedUid.value = step.uid
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

// Auto-arrange enhancement: this used to hard-truncate every label to 24
// characters, independent of and inconsistent with the node's actual
// rendered width (150px flat, also fixed) — a label like "S2 · Generate Fee
// Invoice" got cut to "…Invoi…" even where a wider box would have shown it
// whole. Node width is now label-driven and truncation lives in ONE place,
// generateSwimlane.js's fitLabel/nodeWidth, so the two decisions can never
// disagree — this just builds the full "step_id · step_name" text.
function labelFor(row) {
  const id = row.step_id ? `${row.step_id} · ` : ''
  return `${id}${row.step_name || 'Untitled'}`
}

function bandRect(lane) {
  return direction.value === 'TB'
    ? { x: lane.pos, y: 0, width: lane.size, height: diagram.value.height }
    : { x: 0, y: lane.pos, width: diagram.value.width, height: lane.size }
}

// Node-type fill wash: a tint, not a saturated block — restrained per
// ui-design ("color sparingly... small components"). 0.16 (U5's original
// value) read as washed-out/near-white on screen (0.1 CR); 0.32 keeps it a
// wash — the border still carries the full-strength hue — while actually
// being visible as a tint at a glance instead of needing to squint.
const NODE_FILL_OPACITY = '0.32'
function nodeFill(node) {
  return nodeHues.value[node.step_id] || nodeTypeColor('').hex
}

// Selected-node highlight (replaces the old floating detail panel as the only
// "this is the node you clicked" cue, now that details live in the Inspector)
// takes priority; otherwise the border itself carries the node-type hue —
// shape + color together are the "one vocabulary" §3 asks for.
function nodeStroke(node) {
  return node.step_id === selectedUid.value
    ? { stroke: '#2563eb', 'stroke-width': '2.5' }
    : { stroke: nodeFill(node), 'stroke-width': '1.5' }
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
      <Tooltip text="Add a new step to this map">
        <Button variant="solid" @click="addNode">
          <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
          Add Node
        </Button>
      </Tooltip>
      <p class="ml-auto text-xs text-ink-gray-5">
        Click a node for details (opens in the Inspector) · drag to reposition or
        move it into another lane
      </p>
    </div>

    <!-- canvas (scrolls); node details dock in the shared right-column
         Inspector (MapSettingsInspector), not a floating panel here — see
         MapWorkspace.vue / MapSettingsInspector.vue. -->
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
        :width="canvasWidth"
        :height="canvasHeight"
        :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
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

        <!-- header (BACKLOG 4.2): client / process / sub-process / map title /
             version / direction — on-screen AND exported, since this is the
             same <svg> exportDiagram.js reads. -->
        <DiagramHeader
          :width="canvasWidth"
          :height="HEADER_HEIGHT"
          :crumb="headerCrumb"
          :title="headerTitle"
          :meta="headerMeta"
        />

        <!-- the engine's own lane/node/edge geometry, offset below the header
             (and centered if the legend needed a wider canvas than the lanes
             do) — a pure translate, so generateSwimlane.js's coordinates are
             untouched. -->
        <g :transform="contentTransform">
          <!-- lane bands (BACKLOG 4.1): a rotating soft-tint palette per
               lane — a different color axis than node-type — instead of the
               old flat alternating gray, so a map with several lanes is
               easier to scan at a glance. -->
          <g v-for="lane in diagram.lanes" :key="`lane-${lane.index}`">
            <rect
              v-bind="bandRect(lane)"
              :fill="laneTint(lane.index).fill"
              :stroke="laneTint(lane.index).stroke"
              stroke-width="1"
            />
            <!-- label header strip at the flow start -->
            <rect
              v-bind="labelStrip(lane)"
              :fill="laneTint(lane.index).label"
              :stroke="laneTint(lane.index).stroke"
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
                :fill="nodeFill(node)"
                :fill-opacity="NODE_FILL_OPACITY"
                v-bind="nodeStroke(node)"
              />
              <polygon
                v-else-if="geo.kind === 'polygon'"
                :key="`s-${node.step_id}`"
                :points="pointsAttr(geo.points)"
                :fill="nodeFill(node)"
                :fill-opacity="NODE_FILL_OPACITY"
                v-bind="nodeStroke(node)"
              />
              <rect
                v-else
                :key="`s-${node.step_id}`"
                :x="geo.x"
                :y="geo.y"
                :width="geo.width"
                :height="geo.height"
                :rx="geo.rx"
                :fill="nodeFill(node)"
                :fill-opacity="NODE_FILL_OPACITY"
                v-bind="nodeStroke(node)"
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
            <!-- pain-point badge: issues flagged on the node (T5.2/T5.3,
                 UI-REVAMP §4; both map types, BACKLOG 2.5). Color is the WORST severity among that node's
                 pain points, from the same chipColors.js the Risks strip and
                 PainPointEditor use — a red badge always means at least one
                 High-severity issue, not just "issues exist". -->
            <g v-if="painCounts[node.step_id]">
              <title>{{ painCounts[node.step_id].count }} pain point(s) — worst severity {{ painCounts[node.step_id].severity }}</title>
              <circle
                :cx="node.x + (node.w || 150) / 2 - 6"
                :cy="node.y - (node.h || 58) / 2 + 6"
                r="8"
                :fill="severityChip(painCounts[node.step_id].severity).hex"
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
                {{ painCounts[node.step_id].count }}
              </text>
            </g>
            <!-- detail indicators (UI step U6): a couple of high-signal fields
                 that only otherwise show in the StepInspector (Integrations,
                 Controls/Approvals, Exceptions) get a tiny icon along the
                 BOTTOM edge — see diagram/nodeIndicators.js for which fields
                 and why. Monochrome/small so they read as "more detail here"
                 without competing with the node's own color or the
                 pain-point badge, which stays in the opposite (top-right)
                 corner. -->
            <g v-for="ind in indicatorLayout(node)" :key="ind.key">
              <title>{{ ind.title }}</title>
              <FeatherIcon
                :name="ind.icon"
                :x="ind.x"
                :y="ind.y"
                width="10"
                height="10"
                :strokeWidth="2"
                color="#64748b"
              />
            </g>
          </g>
        </g>

        <!-- footer (BACKLOG 4.2): node-type shape+color legend + generated-by/
             date, same reasoning as the header above. -->
        <DiagramFooter
          :width="canvasWidth"
          :y="footerY"
          :shapes="nodeShapeMap()"
          :generated-by="generatedBy()"
          :generated-date="generatedDate()"
        />
      </svg>
      </div>
    </div>

    <!-- Risks strip (UI-REVAMP §4; BACKLOG 2.5 lifted the old As-Is-only
         gate, both map types now show it): reads the already-loaded store
         steps, no new fetch. Selecting a row opens that node in the same
         shared Inspector a canvas click would. -->
    <RisksStrip :steps="store.state.steps" @select="selectedUid = $event" />
  </div>
</template>
