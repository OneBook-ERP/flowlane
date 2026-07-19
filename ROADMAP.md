# Flowlane Roadmap

## Done (v1)

**Core hierarchy & mapping** — Client → Process → Sub Process → Process Map
→ Map Step, with connections (incl. decision branches) and pain points. Three
capture modes (Wizard, Table, Diagram) sharing one store, one autosave path.
Swimlane generation is a pure, unit-tested layout engine; export (PNG/JPEG/
SVG/PDF) and bulk export (ZIP / combined PDF) all render through that same
engine — no second renderer.

**UI** — a unified workspace shell (tree rail, breadcrumb, docked inspector),
a shared grouped step inspector (General / Input-Output / Logic & Rules /
ERPNext Setup / Connections / Pain Points) reused by Wizard and Diagram node
clicks, a density/color pass (restrained but legible chip system, colored
lane bands, diagram header/footer/legend), and a Tweak panel for comparing
layout options live.

**Client onboarding** — a process catalog seeded across 13 ERPNext modules
(258 steps, 54 sub-processes), picked by module at client creation, with
per-industry-vertical default module suggestions.

**Data import/export** — Excel `.xlsx` export/import (round-trips
connections and pain points), an "AI paste" flow (copy a documented prompt,
paste an external AI tool's reply back into the same importer), and upsert
semantics (re-importing updates existing steps by ID instead of duplicating).

**Admin** — a Frappe Desk workspace for System Manager / Flowlane Manager
oversight of clients, masters, and the process catalog.

See `flowlane-design/PLAN.md`, `UI-REVAMP.md`, `PROCESS-CATALOG.md`, and
`BACKLOG-2026-07-19.md` for the detailed build history.

## Deferred / parked

**Version control.** Process Maps currently carry a plain `version_label`
(text) and `status` (Draft / In Review / Approved) — no real versioning.
Parked design sketch: clone-to-new-version, a Draft → In Review → Approved →
Superseded workflow, auto-supersede on approval, and a version history/diff
view. Not started; needs its own design pass before implementation (same
treatment as the process catalog got).

**Business Requirement (BRD/FRD) capture.** A clearly-labeled, non-functional
preview exists in the Diagram editor's fourth tab — sample requirement
cards (WHAT/WHY, HOW-in-ERPNext, type, priority, linked step), zero backend.
The real feature (a Requirement DocType, linked to steps, with fit-gap
classification downstream) is a separate future initiative from the original
product brief, not yet scoped in detail.

**Fit-Gap analysis, Task/Test Case generation, RTM.** From the original
product brief; not started. These build on top of Requirement capture, so
they're sequenced after it.

**AI agents** (process-understanding, requirements, fit-gap, task/testcase
assistants) — from the original brief's "agentic" vision. Out of scope until
the underlying structured data (Requirement, Fit-Gap) exists to act on.

## Known gaps / rough edges

- **Table doesn't virtualize.** Rendering ~150+ steps gets noticeably slower
  switching back to the Table tab (each row is a live frappe-ui Combobox).
  A real fix needs row virtualization — a feature-scope change, not a quick
  patch.
- **No pain-point count badge on the collapsed tree's map rows.** Would need
  a backend join `get_client_tree` doesn't currently do (per-map pain-point
  counts). Cosmetic; not urgent.
- **Lane Role `sort_order` isn't populated** in seed data — lane ordering in
  the diagram currently falls back to first-appearance-in-data. The
  `sort_order` code path is unit-tested and ready; just needs real values
  seeded.
- **PDF export is raster, not vector** (a deliberate choice to avoid adding
  a PDF library — see `diagram/pdf.js`). Vector output would need a real
  dependency decision.
- **No headless canvas test coverage** for the SVG→PNG/JPEG rasterization
  step — it's exercised via real browser verification during development,
  not in CI-style automated tests, since no headless canvas shim is wired
  into the test setup.
- **"Modules in use" on the client summary is derived**, not stored — it
  reads distinct `erpnext_module` values off the client's mapped steps, so a
  client with no steps yet shows nothing there even if modules were picked
  at onboarding. Labeled as derived in the UI; not considered a bug, but
  worth knowing if the summary numbers look sparse for a fresh client.
- **"Mapping start date" on the client summary is a proxy** (the client
  record's own `creation` timestamp) — there's no dedicated start-date field.
  Labeled as such in the UI.
