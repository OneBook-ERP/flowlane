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

**Inspector mount slot for U3:** `components/editor/MapSettingsInspector.vue` is
the right-column inspector. For U2 it only holds map-level settings (Direction /
Status / Version / Type badge) — the fields that used to sit on the removed
"Open Editor" detail page. It ends with a clearly-labelled placeholder block
(`Step inspector mounts here (U3)`) where U3's shared grouped step inspector
(General / I-O / Logic / ERPNext) should mount, driven by the step selected in
Table or the Diagram node click. Do not build that inspector by editing this
file's placeholder — replace the placeholder block itself.

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
- `ClientTile.vue`, `MapBadge.vue` (As-Is amber / To-Be green), `RenameDialog.vue`,
  `ConfirmDeleteDialog.vue`.
- Dialogs `NewClientDialog.vue`, `ProcessDialog.vue`, `SubProcessDialog.vue`,
  `NewMapDialog.vue` — each `v-model`-driven, emits `saved`, and self-toasts.
- `src/components/workspace/` (added U2) — shell chrome for `ClientWorkspace.vue`:
  `WorkspaceTopBar.vue` (breadcrumb + badge + `#topbar-status-slot`) and
  `TreeRail.vue` (collapsible wrapper around `HierarchyTree`, forwards all its
  events straight through via `v-on="$attrs"` since the page still owns every
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
  `ConnectionEditorDialog.vue`, `PasteDialog.vue`, `columns.js` (Phase 2),
  `DiagramTab.vue`, `DiagramNodePanel.vue` (Phase 3), `WizardTab.vue` (Phase 4),
  `ExportMenu.vue` (Phase 3, S10) — rendered by `MapWorkspace.vue` via
  `Teleport` into the top bar, not inline in `DiagramTab.vue` anymore.
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
Permissions: roles Flowlane Consultant / Flowlane Manager / System Manager (Phase 0).
