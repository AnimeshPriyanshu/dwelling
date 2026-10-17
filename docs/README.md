# Dwelling Documentation

This folder is the project's single source of truth for **what Dwelling is**,
**what is planned**, **what is actually built**, and **how to work on it**.

The documentation is intentionally kept separate from the code so that plans and
decisions are reviewable on their own. Where a document describes something not
yet implemented, it is marked **Pending** or **Undecided** rather than described
as if it exists.

> **Rule:** never document a feature, endpoint, asset, environment variable, or
> command that is not present in the repository. If you are unsure, inspect the
> code first. See [Keeping docs synchronized](#keeping-docs-synchronized).

## Where to start

| I want to… | Read |
| --- | --- |
| Understand the idea | [`project/vision.md`](project/vision.md) |
| See what must be built | [`project/requirements.md`](project/requirements.md) |
| Know what is in/out of scope now | [`project/scope.md`](project/scope.md) |
| Look up a term | [`project/glossary.md`](project/glossary.md) |
| See the long-term plan | [`planning/roadmap.md`](planning/roadmap.md) |
| **See the current ten-day milestones** | [`planning/milestones.md`](planning/milestones.md) |
| **Find my next task / update status** | [`planning/task-board.md`](planning/task-board.md) |
| Log today's work | [`planning/daily-log.md`](planning/daily-log.md) |
| Record a technical decision | [`planning/decisions.md`](planning/decisions.md) |
| Understand the world/gameplay | [`design/game-world.md`](design/game-world.md) |
| Understand canvas + HTML UI split | [`design/ui-ux.md`](design/ui-ux.md) |
| Understand alphabet maps | [`design/maps.md`](design/maps.md) |
| Organize art/sound assets | [`design/assets.md`](design/assets.md) |
| See how the pieces fit | [`architecture/overview.md`](architecture/overview.md) |
| Set up the project locally | [`development/setup.md`](development/setup.md) |
| Know where files live | [`development/folder-structure.md`](development/folder-structure.md) |
| Follow code style | [`development/coding-conventions.md`](development/coding-conventions.md) |
| Test the app manually | [`development/testing.md`](development/testing.md) |
| Document HTTP endpoints | [`api/README.md`](api/README.md) |

## Categories

### `project/`
The stable "why": vision, numbered requirements (`FR-*` / `NFR-*`), scope
boundaries for this phase, and the glossary of domain terms. Changes here are
rare and should reflect product decisions, not daily task churn.

### `planning/`
The living "when" and "what next": the staged [`roadmap.md`](planning/roadmap.md),
the **ten-day** [`milestones.md`](planning/milestones.md) with acceptance
criteria, the checkable [`task-board.md`](planning/task-board.md), the dated
[`daily-log.md`](planning/daily-log.md), and the ADR-style
[`decisions.md`](planning/decisions.md). **This is the folder you touch every
working day.**

### `design/`
Product and content design that is independent of code: world rules and
mechanics, the canvas/HTML interface split, alphabet-based map organization, and
asset conventions. Anything not yet decided is marked **Undecided**.

### `architecture/`
How the system is structured, split into the planned overall architecture and
what actually exists today. Also see [`architecture.md`](architecture.md), the
original short note on module boundaries, which predates this documentation set
and remains authoritative for those boundaries.

### `development/`
Practical, code-facing guidance: local setup, the real repository layout, code
conventions, and manual testing checklists.

### `api/`
Reserved for HTTP endpoint and Socket.IO event documentation once the API grows
beyond the current health check.

## Task tracking workflow

1. **Plan** in [`planning/milestones.md`](planning/milestones.md) — each day has
   an objective, task IDs, acceptance criteria, and a Definition of Done.
2. **Work** from [`planning/task-board.md`](planning/task-board.md) — pick the
   highest-priority `Not Started` task whose dependencies are `Done`, set it to
   `In Progress`.
3. **Log** the day in [`planning/daily-log.md`](planning/daily-log.md) —
   completed work, problems, decisions, and tomorrow's priority.
4. **Record decisions** in [`planning/decisions.md`](planning/decisions.md) via a
   new `ADR-XXXX` entry whenever a choice is hard to reverse.
5. **Close out** — only mark a task `Done` when its acceptance criteria are met
   and verified, not merely because files were created.

Task IDs (`DW-###`) are defined in `milestones.md` and mirrored in
`task-board.md`; keep the two files in sync.

## Keeping docs synchronized

- **Inspect before documenting.** Read the actual files before describing them.
- **Never invent** completed features, endpoints, assets, env vars, or commands.
- **Separate confirmed decisions from assumptions** — use the
  *Confirmed / Assumed / Undecided* markers used throughout these documents.
- **Record significant changes** in `decisions.md`.
- **Update task status only when justified** by repository evidence or explicit
  confirmation.
- **Keep the ten-day plan frontend-focused**; document backend, database, and
  security without letting them pull work away from the current milestone.
- **Do not duplicate detail.** Link to the owning document instead.
- **Stay concise.** If a page is not useful, trim it.
