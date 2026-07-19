# Contributing to Flowlane

## Setup

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch version-16
bench install-app flowlane
cd apps/flowlane/frontend && yarn install
```

```bash
cd apps/flowlane
pre-commit install
```

## Before you write code

For anything beyond a one-line fix, write or update a short plan first —
this repo's `flowlane-design/` directory holds the precedent (`PLAN.md`,
`UI-REVAMP.md`, `PROCESS-CATALOG.md`, `BACKLOG-*.md`). A plan should say
what's being built, what data model or files it touches, and what's
explicitly out of scope. This catches scope creep and data-model mistakes
before they're code.

## Architecture rules (non-negotiable)

- **The consultant-facing app is a standalone SPA**, not built inside Frappe
  Desk. Do not add Desk list/form views for the editing experience. Desk *is*
  used for admin/oversight (the "Flowlane" workspace) — that's a separate,
  legitimate surface; see `frontend/CONVENTIONS.md`.
- **One render-to-SVG path.** The live Diagram tab, single-map export, and
  bulk export all render through the same code
  (`generateSwimlane.js` → `DiagramTab.vue` → `exportDiagram.js`). Never build
  a second/simplified renderer — if bulk or headless rendering needs a map's
  SVG, mount the same component off-screen (see `diagram/renderMapSvg.js`).
- **One color source of truth.** Node-type hues live in `diagram/nodeColors.js`;
  status/map-type/severity chips live in `ui/chipColors.js`. Never hardcode a
  hex or Tailwind color class for something these files already cover.
- **Pure logic stays pure.** Layout math, color mapping, import/export byte
  encoding, and store mutation logic live in plain `.js` modules with real
  unit tests. Vue components hold DOM/browser glue only. Look at
  `diagram/generateSwimlane.js` + `.test.js`, or `diagram/pdf.js` +
  `diagram/zip.js` (hand-rolled, unit-tested against canonical test vectors)
  for the shape to match.
- **No new frontend dependency without a stated reason.** This project has
  deliberately hand-rolled a PDF writer and a ZIP writer rather than pull in
  `jsPDF`/`JSZip`. If you genuinely need a library, say what and why in your
  PR description before adding it.
- **Fieldname gotcha:** never name a Frappe field `process` — it shadows
  `Meta.process()` and silently breaks `bench migrate`. Use `parent_process`
  (label can still say "Process").

## Testing

```bash
cd apps/flowlane/frontend && yarn test     # vitest, keep 100% passing
bench --site $SITE run-tests --app flowlane # pytest
```

Never decrease the passing test count in a PR. Add tests for any new pure
logic — a Vue component with untested logic inside its `<script setup>` is a
sign that logic belongs in a `.js` module instead.

## Verifying UI changes

Claims of "fixed" or "working" need evidence, not just a code read. If you
have a browser tool available, actually load the page and look. Screenshot
before/after for visual bugs. For a subtle layout bug, trace the real
DOM/CSS cause (bounding boxes, computed styles) rather than pattern-matching
to a bug that looked similar — this codebase has more than one case where a
plausible-sounding cause was wrong and a different, verified one was right
(see `git log` for `fix(ui): 2.4` and `fix(diagram): auto-arrange` for
examples of root-causing instead of guessing).

## Commit conventions

Conventional-commit-style subjects: `feat(scope): summary`,
`fix(scope): summary`. Explain *why*, not just *what*, in the body when the
reason isn't obvious from the diff. Reference the backlog/plan item ID
(e.g. `BACKLOG 2.5`) when the commit implements a planned item.

Keep commits scoped — one concern per commit where practical, so each is
independently reviewable and revertable.

## Working concurrently

If more than one contributor (human or agent) is editing the working copy at
once, stick to disjoint files and:
- Never `git add -A` / `git add .` — stage only the files you intend to
  change.
- Run `git status` before every commit; if you see changes you didn't make,
  leave them alone.
- Never `git stash` / `git reset` / `git checkout <path>` on files you don't
  own in the current task.

## Pull requests

Don't push or open a PR without being asked. When you do: describe what
changed and why, list what was explicitly left out of scope, and include
your test evidence (screenshot for UI, test run output for logic).
