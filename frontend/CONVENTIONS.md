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
`pages/MapEditor.vue` is the stable stub. The **Wizard / Table / Diagram** tabs mount
inside its `#editor-tabs` container. Recommended structure for Phase 2+:
- `src/map/` — pure, browser-free domain logic (e.g. Phase 3
  `map/generateSwimlane.js` + vitest), mirroring `data/reorder.js`.
- `src/stores/useMapStore.js` — the single Map Step store (rows + connections +
  pain points); Wizard, Table, and Diagram all read/write it (one data set, three
  views). Create it once in `MapEditor.vue` and `provide`/`inject` it.
- `src/components/editor/` — `MapTabs.vue`, `WizardTab.vue`, `TableTab.vue`,
  `DiagramTab.vue`. Backing APIs (to add): `flowlane.api.map.get_map` /
  `save_steps` / `set_thumbnail` (`validate_graph` already exists).

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
