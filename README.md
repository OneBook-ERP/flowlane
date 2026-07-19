# Flowlane

Client business process mapping for ERPNext implementation consulting.

Flowlane lets a consultant map a client's business processes as swimlane
diagrams — captured via a guided wizard or an Excel-like table — with the
diagram generated live from the same data (the "Excel-to-Visio" model). It's
organized as a client folder, each holding a three-level process hierarchy:

```
Client
 └─ Process            (L1 — value stream, e.g. "Quote-to-Cash")
     └─ Sub Process     (L2 — e.g. "Opportunity & Quotation")
         └─ Process Map (L3 — the swimlane, As-Is or To-Be)
             └─ Map Step rows ──▶ generated swimlane diagram
```

## Features

- **Client workspace** — folder-per-client with a tree of processes,
  sub-processes, and maps; a client summary dashboard (process/map counts,
  pain-point severity breakdown, status breakdown); bulk export of every map
  in a client as a ZIP or a combined PDF.
- **Three ways to capture a map** — a step-by-step guided **Wizard**, an
  Excel-like **Table** (paste from Excel, upload/download real `.xlsx`, or
  paste output from an external AI tool via a documented prompt format), and
  a live-generated **Diagram** (swimlane, colored lanes, node-type shapes and
  colors, header/footer/legend, exportable as PNG/JPEG/SVG/PDF).
- **Process catalog** — client onboarding can seed a starting skeleton of
  processes, sub-processes, and populated map steps for 13 ERPNext modules,
  picked by the modules the client actually uses (with per-industry-vertical
  defaults).
- **Pain points** — logged per step (bottleneck, duplicate entry, missing
  control, delay, unclear ownership, rework, compliance risk), severity-coded,
  surfaced on the diagram and in a map-wide management tab, available on both
  As-Is and To-Be maps.
- **Business Requirement preview** — a mocked, clearly-labeled preview of the
  planned BRD/FRD capture feature (not yet built — see [Roadmap](ROADMAP.md)).
- **Desk workspace** — a Frappe Desk workspace ("Flowlane") for System
  Manager / Flowlane Manager oversight: browse clients, masters, and the
  process catalog via standard list views, separate from the consultant-facing
  app.

## Stack

- **Backend:** Frappe (Python / MariaDB).
- **Frontend:** Vue 3 + frappe-ui + Tailwind, a standalone SPA served at
  `/flowlane` (not built inside Frappe Desk — see
  [`frontend/CONVENTIONS.md`](frontend/CONVENTIONS.md)).
- **Diagram rendering:** SVG, generated client-side from a pure layout engine
  (`frontend/src/diagram/generateSwimlane.js`) — no diagramming library.

## Installation

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch version-16
bench install-app flowlane
```

Master/reference data (node types, lane roles, value streams, industry
verticals, ERPNext modules, the process catalog, the Desk workspace) seeds
automatically and idempotently on install and on every `bench migrate` — see
`flowlane/setup.py`.

## Development

```bash
cd apps/flowlane/frontend
yarn install
yarn dev      # local dev server
yarn build    # production build served at /flowlane
yarn test     # vitest — unit tests for pure logic (diagram engine, store, import/export)
```

```bash
bench --site $SITE run-tests --app flowlane   # backend pytest
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions, and
[ROADMAP.md](ROADMAP.md) for what's built vs. planned.

## Documentation

- [`frontend/CONVENTIONS.md`](frontend/CONVENTIONS.md) — the frontend
  architecture contract: routes, the store API, component layout, the shared
  color/chip system, the export pipeline.
- [`flowlane-design/PLAN.md`](../../flowlane-design/PLAN.md) — the original
  v1 data model, API list, and build phases.
- [`flowlane-design/UI-REVAMP.md`](../../flowlane-design/UI-REVAMP.md) — the
  UI density/navigation revamp plan.
- [`flowlane-design/PROCESS-CATALOG.md`](../../flowlane-design/PROCESS-CATALOG.md)
  — the seeded process/sub-process/step catalog by module.
- [`flowlane-design/BACKLOG-2026-07-19.md`](../../flowlane-design/BACKLOG-2026-07-19.md)
  — the CR/NR/bug backlog and its resolution.

## Contributing

This app uses `pre-commit` for formatting and linting:

```bash
cd apps/flowlane
pre-commit install
```

Configured tools: ruff, eslint, prettier, pyupgrade. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## License

agpl-3.0
