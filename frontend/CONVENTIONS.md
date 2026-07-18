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
| `ClientWorkspace` | `/c/:client` | `pages/ClientWorkspace.vue` | Tree + detail (S2) |
| `Editor` | `/m/:map` | `pages/MapEditor.vue` | Map editor (S6) — Phase-1 STUB |

`:client` is the Flowlane Client name; `:map` is the Flowlane Process Map name.

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
  `new-sub`, `edit-process`, `move-sub`, …). No mutations inside.
- `ClientTile.vue`, `MapBadge.vue` (As-Is amber / To-Be green), `RenameDialog.vue`,
  `ConfirmDeleteDialog.vue`.
- Dialogs `NewClientDialog.vue`, `ProcessDialog.vue`, `SubProcessDialog.vue`,
  `NewMapDialog.vue` — each `v-model`-driven, emits `saved`, and self-toasts.

## Map editor mount point (Phases 2–4)
`pages/MapEditor.vue` mounts the **Wizard / Table / Diagram** tabs (`MapTabs.vue`)
inside its `#editor-tabs` container. Phase 2 wired this: `MapEditor.vue` creates the
store with `provideMapStore(map)`, calls `store.load()` on mount, and renders
`MapTabs`. Later phases only fill the Wizard / Diagram panels — do not re-wire this.
- `src/map/` — pure, browser-free domain logic + vitest, mirroring `data/reorder.js`.
  Phase 2 added `pasteParser.js` (Excel block → field maps) and `steps.js` (row
  factories, `toSavePayload`, `mergeUidMap`). Phase 3 adds `generateSwimlane.js`.
- `src/components/editor/` — `MapTabs.vue`, `TableTab.vue`, `StepRow.vue`,
  `GridCell.vue`, `ConnectionEditorDialog.vue`, `PasteDialog.vue`, `columns.js`
  (Phase 2). Wizard/Diagram tabs are labelled placeholders in `MapTabs.vue` for
  Phases 3–4 to fill.
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
Permissions: roles Flowlane Consultant / Flowlane Manager / System Manager (Phase 0).
