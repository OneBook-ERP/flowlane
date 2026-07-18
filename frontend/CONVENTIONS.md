# Flowlane Frontend — Engineering Conventions (the shared contract)

Every agent building a later phase MUST read this file and follow it exactly. It is
the contract that lets Phases 2–5 build in parallel without colliding. Also read
`flowlane-design/PLAN.md` (the product spec, data model, and build order).

## Cardinal rules (non-negotiable)
1. **Chrome is frappe-ui only.** Use frappe-ui Vue components (`Button`, `Dialog`,
   `FormControl`, `Select`, `Autocomplete`, `Dropdown`, `FeatherIcon`, `toast`, …)
   and frappe-ui Tailwind token classes (`bg-surface-white`, `text-ink-gray-9`,
   `border-outline-gray-1`, `bg-surface-blue-2`, `text-ink-green-3`, …) from
   `frappe-ui/tailwind`. No other UI kit, no hand-rolled color hex in chrome, no
   arbitrary inline styles. Default font is Inter (frappe-ui default).
2. **This is a custom SPA, not Desk.** Never embed Frappe Desk form/list views.
3. **Follow code-style:** small functions, files under ~300 lines, OO-ish modules,
   reuse before abstracting, terse "why" comments, unit tests for pure logic.
4. **Additive integration.** A feature agent creates ONLY new files in its assigned
   folder. It must NOT edit `router.js`, `App.vue`, `pages/MapEditor.vue`, or the
   shared `data/*` modules. Instead it returns integration notes: which component to
   mount where, which data-layer function it calls, any new route. The integrator
   wires it in and keeps `yarn build` green.

## App / paths
- App root: `apps/flowlane/flowlane/` (Python module "Flowlane").
- Frontend SPA: `apps/flowlane/frontend/` (Vue 3 + frappe-ui + Vite + Tailwind).
- SPA served at `/flowlane`; router base `/flowlane`; site `onebook.localhost`,
  dev server on `:8001` (already running via `bench start`).
- Build: `cd apps/flowlane/frontend && yarn build`. Unit tests: `yarn test` (vitest).
- **Fieldname note:** Sub Process links to Process via `parent_process` (label
  "Process") — never `process` (shadows Frappe's `Meta.process`, breaks migrate).

## Router (routes are FIXED — features add, never rename)
`src/router.js`, base `/flowlane`, lazy-loaded components:

| name | path | page | purpose |
|---|---|---|---|
| `Home` | `/` | `pages/HomePage.vue` | Client folder grid (S1) |
| `ClientWorkspace` | `/c/:client` | `pages/ClientWorkspace.vue` | **The unified workspace shell** (S2/S6) — top bar, tree rail, and (when `?map=` is set) the inline map editor, all in one page |
| `Editor` | `/m/:map` | `pages/MapEditor.vue` | Deep-link **resolver**, not a page UI — resolves the map's client via `get_map_location` and `router.replace`s into `ClientWorkspace` with `?map=` set |

`:client` is the Flowlane Client name; `:map` is the Flowlane Process Map name.

### The workspace shell (UI step U2 — B2/B3/B4)
There is no more standalone editor page. `ClientWorkspace.vue` always renders:
`WorkspaceTopBar` (breadcrumb `Client / Process / Sub-process / Map` + As-Is/To-Be
badge + a `#topbar-status-slot` div) → a row of `TreeRail` (collapsible L1→L2→L3,
wraps `HierarchyTree` unchanged) + center pane + (when a map is open) the right
inspector. The active map lives in **this route's own `?map=` query param**, not
a separate route — clicking a map in the tree calls `router.push` with the query
set (no page navigation, tree/scroll state survives); selecting a process/sub
clears it. `/m/:map` is kept as a bookmarkable/shareable entry point that
redirects in.

When `?map=` is set, `ClientWorkspace` mounts `components/editor/MapWorkspace.vue`
**keyed by the map name** (`:key="activeMap"`) inside a `#editor-tabs` container —
keying forces a clean remount (fresh store, fresh tab state) when the user jumps
between maps without leaving the shell. `MapWorkspace.vue` is what `MapEditor.vue`
used to be: it calls `provideMapStore(map)` and `store.load()`, and renders
`MapTabs` — but now it also renders `MapSettingsInspector` (the right column) as
a sibling, and `Teleport`s its Saved/Saving text + `ExportMenu` into the top
bar's `#topbar-status-slot` (a parent component can't `inject()` a descendant's
`provide()`d store, so the top bar reaches live map state this way instead).
`ExportMenu`'s `getSvg` is disabled unless the Diagram tab is actually mounted
(`MapTabs.vue` exposes `{ getSvg, activeTab }` via `defineExpose` for exactly
this) — the SVG only exists in the DOM while that tab is active.

**Inspector mount slot (map-level + selected step):**
`components/editor/MapSettingsInspector.vue` is the workspace shell's ONE
right-column inspector — exactly the "Inspector (context) — selected step /
map settings" box in UI-REVAMP.md's B2 target layout. By default it shows
map-level settings (Direction / Status / Version / Type badge — the fields
that used to sit on the removed "Open Editor" detail page). It takes a
`selectedStep` prop; when non-null it swaps to the shared `StepInspector.vue`
for that step instead (with a "Back to Map Settings" button), reactively
forwarded from `DiagramTab.vue`'s clicked-node selection through
`MapTabs.vue` -> `MapWorkspace.vue` (see `MapTabs.vue`'s `defineExpose` and
`MapWorkspace.vue`'s `diagramSelectedStep` computed — the same
`getSvg`/`activeTab` bridge pattern, extended). Switching to Table or Wizard
unmounts `DiagramTab`, so the selection naturally clears — no stale step
lingers in the inspector after leaving the tab that selected it.

This routing REPLACED a separate floating `DiagramNodePanel.vue` overlay U3
originally built for the Diagram node click (deleted post-U3, see git log):
that absolutely-positioned panel's z-index competed with the Table's sticky
columns and with frappe-ui `Dialog`s in confusing, inconsistent ways (fixed by
`App.vue`'s `isolate`, but the floating panel was also just a worse fit for
"D5: docked right" than the one column B2 already specifies). Do not resurrect
a floating per-tab node panel — route new "show this step's details"
affordances through this same `selectedStep` prop.

**The shared step inspector (UI step U3 — D4/D5):**
`components/editor/StepInspector.vue` is the ONE grouped, tabbed editor for a
Map Step's 15 attributes, mounted at exactly two places:
- `WizardTab.vue` — inline in the current-step panel (replaces the old flat
  `WizardStepPanel.vue`, which U3 deleted). A deliberately separate,
  always-visible guided-capture UX — not routed through the shared Inspector
  column.
- `MapSettingsInspector.vue` — docked in the shared right-column Inspector
  when a Diagram node is selected (see above).

Tabs: **General** (step_id, step_name, lane_role, node_type, workflow_state) ·
**Input/Output** (trigger_input, output_result, key_data_fields) · **Logic &
Rules** (business_rules, exceptions, controls_approvals, kpis) · **ERPNext
Setup** (erpnext_module, erpnext_doctype, integrations) · **Connections**
(`ConnectionsList.vue`, docked) · **Pain Points** (`PainPointEditor.vue`,
As-Is maps only). The field→tab grouping is data, not template logic: each
`columns.js` entry carries a `group` (one of `GROUPS`), and
`columnsByGroup(COLUMNS)` (pure, unit-tested) turns that into the tab list —
COLUMNS' own field order is unchanged (PASTE_FIELDS is positional) so Table and
the inspector never disagree on layout, only on grouping.

Every field tab renders the Table's own `GridCell` per field — the identical
master-driven dropdowns and the identical `store.setField` write path Table
uses, so a Map Step never has two field-editing implementations. Connections
editing was extracted into `ConnectionsList.vue` (pure list + add/remove body,
no Dialog) so there is one connection-editing pattern with two hosts:
`ConnectionEditorDialog.vue` wraps it in a Dialog for the Table row's
"+ connection" affordance, and `StepInspector`'s Connections tab mounts it
docked. Pain Points reuses `PainPointEditor.vue` the same way Wizard always did
(inline, no Dialog); `PainPointDialog.vue` remains the Table row's Dialog host
of that same component. Because both `StepInspector` mounts read the step via
the shared store (`store.findStep(uid)` / the `state.steps` element passed
down as a prop) and write through the same store mutators
(`setField`/`addConnection`/`addPainPoint`/…), editing a field from a selected
Diagram node and reading it from the Wizard rail (or the Table grid) is the
same reactive object — see `stores/useMapStore.test.js` for a store-level
proof of this property.

**Diagram node placement (`src/diagram/laneHit.js`):** dragging a node
persists `manual_x`/`manual_y` (position) same as before, but now ALSO
reassigns `lane_role` when the drop lands in a different lane band's
cross-axis extent (`laneAtCross(lanes, cross)`, pure, unit-tested) — before
this a node dragged into another lane only moved visually and snapped back to
its original lane on the next auto-arrange or reload. `DiagramTab.vue` also
has an "Add Node" toolbar button (`store.addStep()`, then selects it) — parity
with Table's "Add Row" / Wizard's "Add first step"; the Diagram tab previously
had no way to create a step at all.

Pure breadcrumb/ancestry logic (no Vue, no network) lives in
`src/workspace/treeContext.js` — `findMapContext`, `findProcessForSub`,
`breadcrumbTrail`, `crumbLabel` — unit-tested in the sibling `.test.js`. Reuse
these rather than re-deriving ancestry from the tree elsewhere.

## Data layer (`src/data/` — reuse these; do NOT re-fetch elsewhere)
All reads use frappe-ui resources; all writes go through frappe-ui `call('frappe.client.*')`
so server-condition guard messages surface verbatim.

- `masters.js` — `masters` resource (fetched once in `App.vue`) holding every seeded
  dropdown dataset keyed by field: `value_stream`, `category`, `industry_vertical`,
  `node_type`, `lane_role`, `erpnext_module`, `pain_point_type`. Each value is
  `[{label, value}]`. Read options with `masterOptions('lane_role')`.
  Backing API: `flowlane.api.masters.get_masters`.
- `clients.js` — `clients` resource (home grid, enriched with `process_count`) +
  `createClient` / `renameClient` / `deleteClient`. API: `flowlane.api.tree.get_clients`.
- `tree.js` — `loadClientTree(client)` returns a per-client tree resource (nested
  L1→L2→L3 from `flowlane.api.tree.get_client_tree`) + create/update/delete helpers
  for Process, Sub Process, Map. Call `.reload()` after any mutation.
  `getMapLocation(map)` (added U2) resolves a map to its `{client, process,
  sub_process}` for the `/m/:map` deep-link resolver.
- `reorder.js` — pure helpers `moveItem(items, from, to)` + `resequence(ordered)` for
  sub-process ordering. Unit-tested (`reorder.test.js`). No Vue, no network.
- `errors.js` — `serverMessage(error)` extracts the first frappe.throw message from a
  `call` rejection for toasts. Always wrap mutations in try/catch and toast this.

### Tree shape (from `get_client_tree`)
```
{ name, client_name, industry_vertical, status,
  processes: [ { name, process_name, value_stream, category, status,
    sub_processes: [ { name, title, sequence, description,
      maps: [ { name, map_title, map_type, direction, status, version_label } ] } ] } ] }
```

## Components (`src/components/`)
Shared, presentation-only where possible; pages own state + mutations.
- `HierarchyTree.vue` — L1→L2→L3 tree; emits intent events (`select`, `open-map`,
  `new-sub`, `edit-process`, `move-sub`, …). No mutations inside. Takes an
  `autoExpand: string[]` prop (added U2) to force-open ancestors — used to
  reveal a deep-linked map's process/sub without the user manually expanding.
- `ClientTile.vue` (card) / `ClientListRow.vue` (list, added U4 — D2's other
  home-grid mode), `MapBadge.vue` (As-Is amber / To-Be green), `RenameDialog.vue`,
  `ConfirmDeleteDialog.vue`, `TweakPanel.vue` (added U4, mounted once in
  `App.vue` — see "UI step U4" below).
- Dialogs `NewClientDialog.vue`, `ProcessDialog.vue`, `SubProcessDialog.vue`,
  `NewMapDialog.vue` — each `v-model`-driven, emits `saved`, and self-toasts.
- `src/components/workspace/` (added U2) — shell chrome for `ClientWorkspace.vue`:
  `WorkspaceTopBar.vue` (breadcrumb + badge + `#topbar-status-slot`) and
  `TreeRail.vue` (collapsible wrapper around `HierarchyTree`, forwards all its
  events straight through via `v-bind="$attrs"` since the page still owns every
  mutation handler).

## Map editor mount point
`components/editor/MapWorkspace.vue` mounts the **Table / Diagram / Wizard**
tabs (`MapTabs.vue`) inline inside the workspace shell's `#editor-tabs`
container (moved there from the old standalone `MapEditor.vue` page in UI step
U2 — see "The workspace shell" above). It creates the store with
`provideMapStore(map)`, calls `store.load()` on mount, and renders `MapTabs`
plus `MapSettingsInspector` as siblings. Do not re-wire this store lifecycle;
Table/Diagram/Wizard internals fill their own panels and are untouched by U2.
- `src/map/` — pure, browser-free domain logic + vitest, mirroring `data/reorder.js`.
  Phase 2 added `pasteParser.js` (Excel block → field maps) and `steps.js` (row
  factories, `toSavePayload`, `mergeUidMap`). Phase 3 adds `generateSwimlane.js`.
- `src/components/editor/` — `MapWorkspace.vue`, `MapSettingsInspector.vue`
  (both added U2), `MapTabs.vue`, `TableTab.vue`, `StepRow.vue`, `GridCell.vue`,
  `ConnectionEditorDialog.vue`, `ConnectionsList.vue` (U3 extraction), `PasteDialog.vue`,
  `columns.js` (Phase 2), `DiagramTab.vue` (Phase 3), `WizardTab.vue` (Phase 4),
  `StepInspector.vue` (U3 — the shared step inspector, mounted in `WizardTab.vue`
  and `MapSettingsInspector.vue`, see above; `DiagramNodePanel.vue`, its original
  Phase-3/U3 floating-overlay host, was deleted post-U3 — do not recreate it),
  `ExportMenu.vue` (Phase 3, S10) — rendered by `MapWorkspace.vue` via `Teleport`
  into the top bar, not inline in `DiagramTab.vue` anymore.
- `src/data/erpnext.js` — cached `doctypes` resource for the ERPNext DocType picker
  (`flowlane.api.erpnext.get_doctypes`). Read options with `doctypeOptions()`.

### Editor store contract (`src/stores/useMapStore.js`) — SHARED, created in Phase 2
The single Map Step store; Wizard, Table and Diagram all read/write it (one data
set, three views). `MapEditor.vue` calls `provideMapStore(map)`; child tabs get it
with `useMapStore()` (provide/inject via an internal Symbol).
- **`store.state`** (reactive): `header` (map doc fields), `steps` (row array),
  `loading`, `saving`, `dirty`, `error` (a `serverMessage` string).
- **Row shape:** `{ uid, name, ...STEP_FIELDS, connections:[{to_uid,label,condition}],
  pain_points:[...] }`. `uid` is the stable client identity — loaded rows use their
  server `name` as uid; new rows get a generated uid until `save` fills `name` in.
  **Connections reference the target row by `to_uid`, never by step_id/name**, so
  reorders and step_id edits never break an edge; `save_steps` resolves uid → name.
- **Methods:** `load()`, `save()` (immediate), `scheduleSave()` (debounced 1s
  autosave — every mutator already calls it), `addStep(overrides?)`,
  `addRows(fieldMaps)`, `removeStep(uid)` (also strips inbound edges),
  `moveStep(from,to)` / `moveStepBy(uid,delta)` (persists `sequence` via array
  order), `setField(uid,field,value)`, `addConnection`/`setConnection`/
  `removeConnection`, `findStep(uid)`.
- **Persistence:** `save()` sends `toSavePayload(steps)` (dense `sequence`, dropped
  dangling edges) to `flowlane.api.map.save_steps`, then `mergeUidMap` promotes new
  rows to saved. Saves are serialised (one in flight; a queued edit re-saves after).
- Mutating logic that is pure (payload build, reconcile, paste parse) lives in
  `src/map/*` and is unit-tested; the store is the thin reactive/network shell.

### Backend map/erpnext APIs (added Phase 2)
- `flowlane.api.map.get_map(map)` → `{ map: header, steps: [...with connections &
  pain_points] }`, steps ordered by `sequence`.
- `flowlane.api.map.save_steps(map, steps)` — single transactional bulk
  upsert/delete of steps + child rows; `steps` is a JSON array of rows with `uid`,
  optional `name`, scalars, and `connections:[{to_uid,...}]`. Returns
  `{ map, steps, uid_map }`. Server guards (duplicate `step_id`, cross-map edge)
  roll the whole save back and surface via `_server_messages` → `serverMessage`.
- `flowlane.api.erpnext.get_doctypes(module?)` → selectable DocTypes as
  `[{label,value}]`. (`validate_graph` unchanged; `set_thumbnail` still to add.)

## State approach
- Server state lives in frappe-ui resources (`data/*`); reload after writes.
- Local UI state is component-local `ref`/`reactive`. Cross-component editor state
  (Phase 2+) uses one store created in `MapEditor.vue` and shared via provide/inject
  (`useMapStore()`), matching the draw app's store pattern.
- Toasts (`toast.success` / `toast.error`) are the standard user feedback; the
  `FrappeUIProvider` in `App.vue` mounts the toast host.

## Backend (`flowlane/api/`)
Whitelisted methods, `@frappe.whitelist()`. Phase 1 added `tree.py` (`get_clients`,
`get_client_tree`) and `masters.py` (`get_masters`); `map.py` has `validate_graph`.
UI step U2 added `tree.py`'s `get_map_location(map)` — resolves a map to its
`{client, process, sub_process}` ancestry for the `/m/:map` deep-link resolver.
UI step U4 added `modified` to `get_clients`' field list (no schema change) so
the home grid/list can show "edited Nd ago" (D2); formatted client-side by
`src/format/relativeTime.js`.
Permissions: roles Flowlane Consultant / Flowlane Manager / System Manager (Phase 0).

## UI step U4 — density pass + Tweak panel (D1/D2/D3, §5)
Global scale/rhythm, client-home layout modes, and hierarchy-detail header
strips, plus the floating Tweak panel from the ui-design skill / §5 that lets
these be compared live rather than committed blind.

- `src/ui/uiPrefs.js` — the Tweak panel's state: a plain module-level
  `reactive()` singleton (same "one shared resource" shape as `data/masters.js`,
  not Vuex/Pinia), persisted to `localStorage`. Keys: `density`
  (`compact`/`relaxed`, D1), `homeMode` (`grid`/`list`, D2), `treeTheme`
  (`light`/`dark`), `inspectorMode` (`docked`/`overlay`), `tableTextMode`
  (`ellipsis`/`wrap`). Any component reads live values directly off `uiPrefs`
  — no provide/inject wiring needed.
- `src/components/TweakPanel.vue` — floating bottom-right panel (mounted once
  in `App.vue`, so it's available on every route), collapsible to a small gear
  button. Each row is a real layout fork, wired straight to `uiPrefs`; see the
  component using-sites below for what each toggle actually changes.
- **D1 (global rhythm):** `uiPrefs.density` drives row/field vertical padding
  in `StepRow.vue` + `TableTab.vue`'s header (Table rows), `HierarchyTree.vue`
  (tree rows), `StepInspector.vue` (field stack gap), and `ClientTile.vue`
  (card padding/gap) — column widths and sticky behavior are unaffected either
  way, only spacing changes.
- **D2 (client home):** `HomePage.vue` gained a count + search header row
  (`src/data/clientFilter.js`, pure, unit-tested: matches `client_name` /
  `industry_vertical`) and now switches between the existing `ClientTile.vue`
  grid (compact variant targets 6-8/row) and the new `ClientListRow.vue`
  (denser one-row-per-client) based on `uiPrefs.homeMode`. Both show industry,
  status, process count and "edited Nd ago" (`src/format/relativeTime.js`,
  pure, unit-tested).
- **D3 (hierarchy detail):** `ClientWorkspace.vue`'s process/sub-process detail
  pane (no map open) now renders a compact header strip (title + inline
  key-values/chips + the one primary action) instead of a whole page of
  isolated `dl` rows, and the body underneath is never empty — it lists the
  process's sub-processes (click to drill in) or the sub-process's maps (click
  to open), reusing data the tree resource already loaded (no new backend
  call).
## UI step U5 — color system + severity chips + pain-point strip (§3, §4)
Two sibling, pure color-mapping modules are the ONLY places a status/type/
severity/node-type color is decided — every consumer imports one of them
rather than declaring its own Tailwind classes or hex for the same concept:
- `src/diagram/nodeColors.js` (from U1) — Node Type hue only (`dot` class +
  `hex`). Consumers: `GridCell.vue`'s node-type dot (Table, D6),
  `StepInspector.vue`'s header dot, and (new in U5) `DiagramTab.vue`'s SVG
  node fill/stroke.
- `src/ui/chipColors.js` (new in U5) — everything else: `statusChip()` (Map
  *and* Process workflow status — Draft/In Review/Approved, one vocabulary
  shared by both DocTypes), `mapTypeChip()` (As-Is/To-Be), `clientStatusChip()`
  (Active/Prospect/Archived), and `severityChip()` (pain-point Low/Medium/
  High, plus `maxSeverity()`/`severityRank()` for picking one color when
  several severities apply to the same node/map). Each returns `{ classes }`
  (a `bg-surface-<hue>-2 text-ink-<hue>-3` or neutral-gray pair) and, where an
  SVG consumer needs it (severity), a matching `hex`.
- `src/components/StatusChip.vue` — the one chip DOM shape (rounded,
  px-1.5 py-0.5, text-xs font-medium) every HTML consumer of chipColors.js
  renders through, so "chip" markup isn't repeated per component.
  `MapBadge.vue` is now a thin wrapper over `StatusChip` + `mapTypeChip()`
  (same external API — every existing `:map-type="..."` call site is
  unchanged). SVG contexts (the Diagram's pain-point badge circle) use a
  `severityChip(...).hex` directly — an SVG element can't take Tailwind
  classes.
- Status chips render everywhere a Map/Process status or map type is
  DISPLAYED: `HierarchyTree.vue`'s map rows, `WorkspaceTopBar.vue`'s
  breadcrumb, and `ClientWorkspace.vue`'s process/sub-process detail lists.
  `MapSettingsInspector.vue`'s Status field stays a plain `FormControl`
  select (it's the one place status is *edited*, not just shown) — Type
  there was already a read-only `MapBadge`, unchanged.
- Severity chips render in `PainPointEditor.vue` (next to each pain point's
  severity select) and in the new Risks strip (below). `DiagramTab.vue`'s
  per-node pain-point badge (built in Phase 5) now colors by
  `maxSeverity()` of that node's pain points instead of a hardcoded red.
- **Diagram color adoption (§3's flagged U1 gap):** `DiagramTab.vue` no
  longer renders flat white node fills. Each node's shape now gets a light
  node-type tint (`fill-opacity="0.16"` over `nodeTypeColor(...).hex`) plus a
  matching-hue border (replacing the old generic slate stroke); the blue
  selection highlight still overrides both on click. Lookup is by the row's
  `node_type` (via `store.findStep`-equivalent maps keyed by uid == engine
  `step_id`, the same trick `painCounts` already used) since the pure
  `generateSwimlane.js` engine's output nodes don't carry `node_type` — this
  is chrome-only, the engine/layout logic is untouched.
- **Risks strip (§4):** `src/diagram/risks.js` (`collectRisks(steps)`, pure,
  unit-tested) flattens an As-Is map's `pain_points` across all steps into a
  worst-first list; `components/editor/RisksStrip.vue` renders it under the
  Diagram canvas (As-Is maps only, hidden entirely when there are no pain
  points) with severity chips + step label, reading `store.state.steps`
  directly — no new API call. Clicking a row sets `DiagramTab.vue`'s
  `selectedUid`, opening that node in the shared Inspector exactly like a
  canvas click.
- **Known gap, not built:** a pain-point count badge on TreeRail's map rows
  (browsing the tree WITHOUT opening a map) needs a per-map aggregate the
  tree API doesn't return today — `get_client_tree`'s `_maps()` (`tree.py`)
  fields are `name, map_title, map_type, direction, status, version_label`
  only; pain points live on Map Step child rows the tree query never joins.
  Adding that count would mean touching backend/API surface, which UI-step
  guardrails say to stop and report rather than guess at — the Diagram's own
  per-node badge and the Risks strip (both already-loaded-map-scoped, no new
  fetch) deliver the rest of §4 without it.
- **CTA audit (§3 "one primary CTA per screen"):** Diagram's toolbar had
  zero `solid` buttons (Toggle direction / Auto-arrange / Add Node were all
  `subtle`) while Table ("Add Row") and Wizard ("Add first step"/"Add next
  step") each already had exactly one — promoted Add Node to `solid` for
  parity. `ClientWorkspace.vue`'s process/sub-process detail screens (no map
  open) had zero `solid` buttons either ("Add Sub Process"/"Add Map" were
  `subtle`) — promoted both. Export (`ExportMenu.vue`, teleported into the
  top bar) stays `subtle` deliberately: it's persistent chrome visible across
  all three tabs, and making it `solid` would put two solid buttons on
  screen at once whenever Table or Wizard's own primary action is also
  visible.

- **§5 remaining toggles:** `TreeRail.vue`'s `treeTheme` swaps to a dark rail
  background — `HierarchyTree.vue` is reused unchanged (per U2's convention)
  so the dark variant recolors it as a unit via a scoped `:deep()` block using
  Tailwind's `theme()` CSS function (resolves through this project's real
  frappe-ui-customized palette, not assumed stock Tailwind hex — verified in
  the built CSS output). `MapWorkspace.vue`'s `inspectorMode` toggles
  `MapSettingsInspector` between its docked flex-sibling layout (U2 default)
  and an absolutely-positioned overlay that lets `MapTabs` use the full pane
  width. `GridCell.vue`'s `tableTextMode` swaps long free-text columns
  (`column.ellipsis`) between the single-line-+ tooltip input (default) and a
  small multi-line `textarea` that genuinely wraps (row height grows — no
  fixed row height exists to fight).
