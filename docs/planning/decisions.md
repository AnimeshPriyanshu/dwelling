# Architecture Decision Records

Significant, hard-to-reverse decisions and their reasoning. Format is loosely
based on ADR (Architecture Decision Record).

**Rules**

- Record decisions **actually made** — not discussions that did not happen. If a
  choice was simply inherited from the scaffold, say so.
- One decision per record. Superseded records are **not deleted**; mark them
  `Superseded by ADR-XXXX` so the history stays readable.
- Keep records short: context, decision, alternatives, consequences.
- Link the ADR from [`daily-log.md`](daily-log.md) on the day it was made.

## Status key

| Status | Meaning |
| --- | --- |
| `Accepted` | Decided and in effect. |
| `Proposed` | Suggested, not yet agreed. |
| `Superseded` | Replaced by a later record. |
| `Rejected` | Considered and declined — kept so the option is not re-litigated blindly. |

## Index

| ID | Title | Status | Date |
| --- | --- | --- | --- |
| [ADR-0001](#adr-0001--npm-workspace-monorepo-instead-of-separate-repositories) | npm-workspace monorepo instead of separate repositories | Accepted (inherited) | before 2026-09-20 |
| [ADR-0002](#adr-0002--vanilla-javascript--phaser-3-instead-of-a-framework) | Vanilla JavaScript + Phaser 3 instead of a framework | Superseded by ADR-0016 | before 2026-09-20 |
| [ADR-0003](#adr-0003--express--socketio-as-the-backend-transport) | Express + Socket.IO as the backend transport | Accepted (inherited) | before 2026-09-20 |
| [ADR-0004](#adr-0004--postgresql-with-prisma-for-persistence) | PostgreSQL with Prisma for persistence | Accepted (inherited) | before 2026-09-20 |
| [ADR-0005](#adr-0005--html-ui-around-the-canvas-rather-than-in-canvas) | HTML UI around the canvas rather than in-canvas | Accepted | 2026-10-17 |
| [ADR-0006](#adr-0006--alphabet-based-maps-as-stable-url-less-ids) | Alphabet-based maps as stable, URL-less ids | Accepted | 2026-10-17 |
| [ADR-0007](#adr-0007--placeholder-art-generated-in-code-until-assets-exist) | Placeholder art generated in code until assets exist | Superseded by ADR-0019 | 2026-10-17 |
| [ADR-0008](#adr-0008--documentation-first-planning-system) | Documentation-first planning system | Accepted | 2026-10-17 |
| [ADR-0009](#adr-0009--no-automated-test-runner-during-the-frontend-phase) | No automated test runner during the frontend phase | Superseded by ADR-0020 | 2026-10-17 |
| [ADR-0010](#adr-0010--16-bit-pixel-art-top-down-with-a-slight-34-tilt-cozy-palette) | 16-bit pixel art, top-down with a slight 3/4 tilt, cozy palette | Accepted | 2026-10-17 |
| [ADR-0011](#adr-0011--cc0-packs-plus-code-authored-art-no-image-generator-available) | CC0 packs plus code-authored art (no image generator available) | Superseded by ADR-0019 | 2026-10-17 |
| [ADR-0012](#adr-0012--interiors-as-one-shared-room-template-behind-a-door-trigger) | Interiors as one shared room template behind a door trigger | Accepted | 2026-10-17 |
| [ADR-0013](#adr-0013--chat-is-a-docked-sidebar-with-explicitly-labelled-mock-data) | Chat is a docked sidebar with explicitly labelled mock data | Accepted | 2026-10-17 |
| [ADR-0015](#adr-0015--private-11-conversations-group-conversations-only-in-altars) | Private 1:1 conversations; group conversations only in Altars | Accepted — Altars scheduled as Phase 12 | 2026-10-17 |
| [ADR-0016](#adr-0016--react-as-the-ui-framework-with-phaser-for-the-2d-world) | React as the UI framework with Phaser for the 2D world | Accepted | 2026-10-17 |
| [ADR-0017](#adr-0017--fullscreen-immersive-canvas-with-slide-out-chat-drawer-on-house-interaction) | Fullscreen immersive canvas with slide-out chat drawer on house interaction | Accepted | 2026-10-17 |
| [ADR-0018](#adr-0018--map-data-format-and-registry-reused-scene-loading) | Map data format and registry, reused-scene loading | Accepted | 2026-10-19 |
| [ADR-0019](#adr-0019--use-the-supplied-sunnyside-world-and-sprout-lands-packs-as-primary-art) | Use the supplied Sunnyside World and Sprout Lands packs as primary art | Accepted | 2026-11-12 |
| [ADR-0020](#adr-0020--adopt-eslint-prettier-vitest-and-ci) | Adopt ESLint, Prettier, Vitest and CI | Accepted | 2026-11-13 |
| [ADR-0021](#adr-0021--five-model-messaging-core-extended-with-kind-for-altars) | Five-model messaging core, extended with `kind` for Altars | Accepted | 2026-11-13 |
| [ADR-0020](#adr-0020--one-to-one-conversations-only-no-group-conversations-or-altars) | One-to-one conversations only; no group conversations or Altars | Accepted | 2026-11-13 |
| [ADR-0021](#adr-0021--contacts-are-mutual-add-pairs-with-no-requestaccept-flow) | Contacts are mutual-add pairs with no request/accept flow | Accepted | 2026-11-13 |
| [ADR-0022](#adr-0022--jwt-authentication-using-an-httponly-cookie) | JWT authentication using an HttpOnly cookie | Accepted | 2026-11-14 |

---

## ADR-0001 — npm-workspace monorepo instead of separate repositories

**Status:** Accepted (inherited from the initial commit, `2f176e2`)
**Date:** before 2026-09-20

### Context
Dwelling needs a browser frontend, a server, a database schema, and a small
shared-contracts package. A college project must be easy to run and submit as a
unit.

### Decision
Use a single repository with npm workspaces: `frontend`, `backend`, `database`,
`shared`. Cross-workspace code is imported through workspace packages (for
example `@dwelling/shared`).

### Alternatives considered
- **Separate repositories per concern** — cleaner isolation, but four checkouts
  to keep in sync and no simple single-command start for grading.
- **Single flat package with folders** — simplest, but loses per-workspace
  dependency and script boundaries, and would mix frontend and backend deps.

### Consequences
- ✅ One `npm install`, one root script surface, one submission.
- ✅ Boundaries are explicit (`shared/` cannot import from `frontend/`).
- ⚠️ Root scripts must be kept in sync when workspaces gain scripts.
- ⚠️ A single lockfile means a dependency problem in one workspace can affect the
  whole install.

### Related
[`development/folder-structure.md`](../development/folder-structure.md),
[`architecture/overview.md`](../architecture/overview.md).

---

## ADR-0002 — Vanilla JavaScript + Phaser 3 instead of a framework

**Status:** Superseded by ADR-0016
**Date:** before 2026-09-20

### Context
The project needs a 2D rendered world plus conventional web UI. It is a student
project, so the stack must be learnable and its behavior transparent.

### Decision
Frontend is **vanilla JavaScript (ES modules), HTML5, CSS3, bundled by Vite**,
with **Phaser 3** for the 2D world. **No React. No TypeScript.**

This decision was superseded when the project decided to adopt React for
the UI framework while keeping Phaser for the 2D world.

### Alternatives considered
- **React (+ a canvas/Phaser wrapper)** — the usual way to build panels, but it
  would add a second rendering model and component lifecycle alongside Phaser's
  scene lifecycle, for a UI that is currently two panels.
- **TypeScript** — stronger contracts, but adds a build/type layer the project
  does not yet need.
- **Game engines with editors (Unity/Godot) exporting to web** — heavier
  toolchain, harder to review as a web project.

### Consequences
- ✅ One lifecycle model (Phaser scenes) and no framework abstraction over the
  game loop.
- ✅ Direct DOM access for the HTML UI, which keeps the canvas/DOM bridge simple.
- ⚠️ No framework means UI state and DOM updates are hand-written; the DOM bridge
  must be intentionally small (see ADR-0005).
- ⚠️ Misuse of plain JS becomes easy — hence
  [`development/coding-conventions.md`](../development/coding-conventions.md).
- ⚠️ This decision was superseded by ADR-0016.

---

## ADR-0003 — Express + Socket.IO as the backend transport

**Status:** Accepted (inherited from `2f176e2`)
**Date:** before 2026-09-20

### Context
Chat requires both request/response calls (history, contacts) and server-pushed
events (new messages, presence). The backend exists as scaffolding only.

### Decision
Express for HTTP and Socket.IO for realtime, with Redis isolated behind
`backend/src/cache/` and Prisma isolated behind `backend/src/db/`.

### Alternatives considered
- **HTTP polling only** — simple, but wasteful and awkward for message push.
- **Plain WebSockets** — fewer abstractions, but reconnect/rooms/fallback must be
  hand-built.
- **Serverless functions** — poor fit for long-lived socket connections.

### Consequences
- ✅ Rooms map naturally onto conversations and Altars.
- ✅ Easy CORS/reconnect handling for a demo.
- ⚠️ The client proxy for `/socket.io` is already configured in
  `frontend/vite.config.js`, so realtime work later needs no proxy changes.
- ⚠️ Own transport layer must still be kept thin — see ADR on module boundaries
  in [`architecture/overview.md`](../architecture/overview.md).

---

## ADR-0004 — PostgreSQL with Prisma for persistence

**Status:** Accepted (inherited from `2f176e2`)
**Date:** before 2026-09-20

### Context
The long-term product stores users, dwellings, conversations, messages, and
Altars — strongly relational data with predictable access patterns.

### Decision
PostgreSQL with Prisma. The schema lives in `database/prisma/schema.prisma`;
migrations are managed from the `database` workspace.

### Alternatives considered
- **MongoDB** — flexible documents, but the data is relational (membership
  joins, message ordering) and would need manual consistency handling.
- **SQLite** — zero setup, but a poor match for later concurrent multi-user
  testing.

### Consequences
- ✅ Generated client gives typed-ish access and a single schema source.
- ⚠️ **No migrations have been generated yet**; the first migration is required
  before any real data work.
- ⚠️ Local development requires a running PostgreSQL instance (see
  [`development/setup.md`](../development/setup.md)).

---

## ADR-0005 — HTML UI around the canvas rather than in-canvas

**Status:** Accepted
**Date:** 2026-10-17

### Context
The existing frontend already renders an HTML shell: a World panel and a
Conversations panel (`frontend/src/main.js`). Chat, menus, and text input are
needed eventually, and Phaser's canvas input is a poor fit for text entry,
selection, and accessibility.

### Decision
The **Phaser canvas renders the world only**. Chat, panels, HUD text, and input
live in **HTML/CSS around or above the canvas**. The two sides communicate
through a single bridge module (planned as DW-035), not by reaching into each
other's internals.

### Alternatives considered
- **Everything inside Phaser (DOM elements in scenes)** — avoids a bridge, but
  makes the chat UI painful to build and test.
- **Canvas as a background with all UI overlaid absolutely** — flexible layout,
  but couples UI positioning to canvas geometry.
- **Replacing the current HTML shell** — would discard existing working layout.

### Consequences
- ✅ Keeps the existing two-panel layout and its CSS working.
- ✅ The chat UI can be built and inspected with ordinary DOM tools.
- ✅ Meets NFR-010 (keyboard-accessible UI) far more easily than canvas UI.
- ⚠️ Introduces a synchronization point: input focus must not be captured by
  both the canvas and an open panel.
- ⚠️ The bridge must be a real module — this becomes a rule, not a suggestion.

### Related
[`design/ui-ux.md`](../design/ui-ux.md), FR-022 to FR-025.

---

## ADR-0006 — Alphabet-based maps as stable, URL-less ids

**Status:** Accepted (2026-10-19 — two maps now load and switch; DW-033/DW-034)
**Date:** 2026-10-17

### Context
Contacts must be split across several maps. The concept (documented in the root
README) is to group them by the first letter of their name.

### Decision
Fix eight alphabet ranges — `A–C`, `D–F`, `G–I`, `J–L`, `M–O`, `P–R`, `S–U`,
`V–Z` — and give each map a **stable string id** derived from the range (for
example `a-c`). Map ids identify loading keys and are not exposed as URLs in this
phase.

### Alternatives considered
- **One map per letter (26 maps)** — precise, but 26 mostly-empty maps to author.
- **Fixed-size pagination of the contact list** — even distribution, but loses
  the memorable letter association that makes the world navigable.
- **Numeric indices** — simple, but meaningless to a human reading map data.

### Consequences
- ✅ A contact's map is derivable from their name, so placement needs no
  configuration.
- ✅ Ranges can be changed later in one place if a range gets too crowded.
- ⚠️ Uneven distribution (many contacts starting with "S") will crowd `S–U`. A
  split rule may be needed later; not designed yet.
- ✅ Verified 2026-10-19: `a-c` and `s-u` both load by id and switch without a
  page reload, so the id/range scheme is accepted.
- ⚠️ The four Milestone 5 contacts (E, K, L, R) were authored on `a-c` before
  this scheme landed; they remain there with their original ids. Fully deriving
  placement from names is tracked as the remaining FR-017 gap.

### Related
[`design/maps.md`](../design/maps.md), FR-017 to FR-021.

---

## ADR-0007 — Placeholder art generated in code until assets exist

**Status:** Superseded by ADR-0019
**Date:** 2026-10-17

### Context
The repository contains **no game assets**: `frontend/public/` holds only
`favicon.svg` and `icons.svg`, and there is no `frontend/public/assets/`
directory or sprite sheet of any kind.

### Decision
For the current phase, world visuals are **generated procedurally in code**
(colored shapes and simple patterns). Asset folders and loading code are prepared
so real art can drop in later without restructuring.

### Alternatives considered
- **Block Day 2–3 on obtaining art** — would stall the entire plan on a
  non-code dependency.
- **Use third-party asset packs now** — adds licensing/provenance questions and a
  large binary diff for a college project.
- **Draw art by hand now** — high effort, low value while mechanics are unproven.

### Consequences
- ✅ The plan stays unblocked; movement and collision can be built and tested.
- ✅ Keeps the repository free of binaries whose origin must be justified.
- ⚠️ DW-019 (walk animation) stays **Blocked** until a sprite sheet exists.
- ⚠️ A visual rework is expected once real assets arrive; mechanics should not
  depend on sprite dimensions.

### Related
[`design/assets.md`](../design/assets.md).

---

## ADR-0008 — Documentation-first planning system

**Status:** Accepted
**Date:** 2026-10-17

### Context
Dwelling is being built incrementally by one developer over a short, time-boxed
period. Work needs to survive interruptions and be reviewable, and the project
has to demonstrate process, not just code.

### Decision
Maintain a `docs/` tree that separates **project** (stable intent),
**planning** (living plan and tracking), **design** (world and UI), **architecture**
(system structure), **development** (how to work), and **api** (reserved).
Tasks carry stable `DW-###` ids shared between
[`milestones.md`](milestones.md) and [`task-board.md`](task-board.md), and are
marked `Done` only against verified acceptance criteria.

### Alternatives considered
- **Code comments and the README only** — no plan/tracking artifact, and history
  is lost.
- **A task tracker outside the repository** — better filtering, but the plan is
  no longer reviewable alongside the code it describes.
- **Documentation generated from code** — not viable while the features do not
  exist.

### Consequences
- ✅ Plan, decisions, and progress are reviewable in the repository.
- ✅ Documentation rules explicitly forbid claiming unimplemented features.
- ⚠️ Maintains cost: two files must stay in sync, and
  [`daily-log.md`](daily-log.md) must be written daily to be worth anything.

### Related
[`../README.md`](../README.md), root [`README.md`](../../README.md).

---

## ADR-0009 — No automated test runner during the frontend phase

**Status:** Superseded by ADR-0020
**Date:** 2026-10-17

### Context
No test script exists in any `package.json`, and there is no test runner
installed. The frontend's first milestone is visual and interactive.

### Decision
For now, verification is **manual**, using the checklists in
[`development/testing.md`](../development/testing.md) and per-milestone testing
checklists. Automated tests are deferred, and the docs must not claim any exist.

### Alternatives considered
- **Add Vitest immediately** — reasonable tooling, but there is almost no pure
  logic to test yet, so tests would mostly assert library behavior.
- **Install Playwright for the canvas** — canvas assertions are brittle and would
  cost more than the manual checks at this stage.

### Consequences
- ✅ Effort goes into the world instead of test infrastructure that has nothing
  to test.
- ⚠️ Regressions depend on the developer actually running the checklists.
- ⚠️ When map data (DW-032) and the DOM bridge (DW-035) land, they are pure
  logic and become the natural first candidates for automation — revisit this
  ADR then.
- ⚠️ This record must be superseded if/when a test runner is added.

### Related
[`development/testing.md`](../development/testing.md), DW-B08.

---

## ADR-0010 — 16-bit pixel art, top-down with a slight 3/4 tilt, cozy palette

**Status:** Accepted
**Date:** 2026-10-17

### Context
Dwelling had no visual direction at all. Every asset decision, every map layout,
and the eventual look of the graded demo depend on it. This was the first question
in the requirements session.

### Decision
**16-bit pixel art**, **top-down with a slight 3/4 tilt** (buildings show a little
of their front face), in a **cozy, warm palette** — wood, lantern light, autumn
tones. Pixel art is authored on a 16×16 tile grid with buildings at
32×32–64×48.

### Alternatives considered
- **Flat vector / minimal** — easier to keep clean, but the owner chose pixel art.
- **Hand-drawn / illustrated** — best atmosphere, highest risk of inconsistency
  without an artist.
- **Full isometric** — rejected: roughly doubles collision, draw-order sorting and
  map-data work, which is unaffordable in the time available (the rear-wall
  painter's-algorithm problem alone is a day's work).
- **Dusk/twilight palette** — strongly atmospheric and makes windows glow, but
  harder to read at small sizes; kept as a possible future pass.

### Consequences
- ✅ Collision, camera and map authoring stay simple — the tilt costs almost
  nothing over straight top-down.
- ✅ "Cozy warmth" is a concrete test for every asset choice: if it looks cold or
  clinical, it is wrong.
- ✅ Interiors benefit most from this direction — lantern light and wood read well
  at 16×16.
- ⚠️ Sprite **visual footprints differ from their collision bodies**; body size and
  offset must be set explicitly (see Milestone 4 risks).
- ⚠️ Palette discipline is manual — there is no tooling to enforce it.

### Related
[`../design/game-world.md`](../design/game-world.md),
[`../design/assets.md`](../design/assets.md), [`milestones.md`](milestones.md).

---

## ADR-0011 — CC0 packs plus code-authored art (no image generator available)

**Status:** Superseded by ADR-0019
**Date:** 2026-10-17

### Context
The repository contains **no game assets whatsoever** — no sprites, tilesets,
houses, furniture, fonts or audio. The owner asked for generated assets, but the
environment was checked and **there is no image-generation model available**: no
Pillow, no ImageMagick, no `sharp`/`canvas`/`pngjs`, and no image binaries. Only
`ffmpeg` and Python's `zlib` + `struct` are present.

### Decision
A **hybrid** approach: source **CC0 asset packs** for ground tiles, house
exteriors, props and interior furniture, and **code-author** the pieces specific
to Dwelling (the Altar, HUD icons, possibly the player sheet). Every third-party
file's pack, author, license and URL is recorded in
`frontend/public/assets/CREDITS.md` **before** it is used.

### Alternatives considered
- **AI image generation** — not available in this environment. Had it been, the
  output would still have needed background removal, exact sizing and
  sprite-sheet slicing before Phaser could use it.
- **Everything code-authored** — fully original and licence-free, but realistically
  limits detail. Hand-authoring furniture, which packs provide ready-made, is
  where the hours would go.
- **Mostly packs, minimal original art** — fastest and most visually complete, but
  the style becomes whatever the pack author chose.
- **Owner supplies the art** — offered and declined for now.

### Consequences
- ✅ A complete 16-bit set (tiles, houses, furniture, props) without an artist.
- ✅ `CREDITS.md` doubles as evidence for the graded report.
- ✅ Code-authored Altar art guarantees the landmark looks unlike anything else.
- ⚠️ **Licence verification is mandatory** (NFR-014). No asset ships without a
  recorded, permissive license; unverifiable files are replaced.
- ⚠️ Style consistency across packs is a real risk — prefer one pack family and
  review visually before committing.
- ⚠️ Sprite grids may need slicing/repacking for Phaser (DW-047).

### Related
[`../design/assets.md`](../design/assets.md), DW-044 – DW-047.

---

## ADR-0012 — Interiors as one shared room template behind a door trigger

**Status:** Accepted
**Date:** 2026-10-17

### Context
The owner asked to be able to enter houses and find a fireplace, a kitchen and a
bed. Interiors are a substantial change: the world is no longer a single flat map,
and doors become authored map data with their own return positions.

### Decision
**One shared interior template**, used by every dwelling. Entering happens through
a **door trigger** on the dwelling; exiting returns the player to the door of the
dwelling they entered. Interiors are **data**, using the same room/map format as
exteriors where possible, rendered by the same scene rather than a scene per room.

### Alternatives considered
- **Per-dwelling authored interiors** — more character, but multiplies map-data
  work and buys little before the interaction loop is proven.
- **Interior for the player's own dwelling only** — smaller, but it removes the
  most interesting half of the demonstration.
- **No interiors this phase** — the safe option; the owner extended the schedule
  instead, specifically to keep them.

### Consequences
- ✅ Proves the "more than one location" architecture for a fraction of the cost.
- ✅ Personalising a room later becomes a data change, not a rewrite (DW-B04).
- ✅ Door triggers reuse the interaction-zone concept built in Milestone 5.
- ⚠️ **Return positions must track which dwelling was entered** — the most likely
  bug of Day 8. Test with two dwellings, not one.
- ⚠️ Exterior and interior collision differ (walls, furniture), so both need
  their own bounds and obstacle data.
- ⚠️ One dwelling now has **two** interaction points (door and house). The door
  zone is smaller and takes priority where they overlap.

### Related
[`../design/game-world.md`](../design/game-world.md),
[`../design/maps.md`](../design/maps.md), DW-049 – DW-054.

---

## ADR-0013 — Chat is a docked sidebar with explicitly labelled mock data

**Status:** Accepted
**Date:** 2026-10-17

### Context
There is no messaging backend, no auth, and no real contacts. The conversation UI
still has to exist for the demo, and the frontend must not imply working messaging
that does not exist (a documented rule in this project).

### Decision
The conversation UI is a **docked sidebar replacing the existing Conversations
panel**, populated with **mock contacts and message history that are visibly
labelled as mock data**. There is no enabled message input. While the panel is
open, the DOM owns the keyboard and `Esc` closes it back to the world.

### Alternatives considered
- **Panel overlay above the canvas** — feels more game-like, but covers the world
  and complicates focus handling.
- **Empty panel with the contact name only** — completely honest but a weak demo.
- **Mock messages with no label** — rejected outright: a viewer would reasonably
  believe sending works.
- **No panel at all this phase** — removes the bridge and its architecture lesson.

### Consequences
- ✅ Reuses the existing two-column layout; the world stays fully visible.
- ✅ The Phaser ↔ DOM bridge gets built and proven, which the real messaging phase
  depends on.
- ✅ Nothing misrepresents itself as working (FR-033).
- ⚠️ Labelling must be *obvious* — a comment in the code is not enough.
- ⚠️ Input focus between canvas and sidebar is now a defined rule that must
  actually be implemented and tested (DW-038).

### Related
[`../design/ui-ux.md`](../design/ui-ux.md), DW-035, DW-036, DW-048.

---

## ADR-0014 — Ten-day frontend schedule supersedes the seven-day plan

**Status:** Accepted
**Date:** 2026-10-17

### Context
The original plan was seven days (~35h). The requirements session added house
interiors and confirmed the map selector and second map, which together exceed
what seven days can hold at 4–6 focused hours per day.

### Decision
The frontend phase becomes **ten days, 59 tasks, roughly 54 hours**, keeping the
original seven-day structure and extending it: Days 8–10 cover interiors, the
Altar and polish, and integration. **Day 9 is the schedule buffer**, and existing
task IDs are preserved so previously written references stay valid.

### Alternatives considered
- **Cut interiors to fit seven days** — would have removed the feature the owner
  most wanted.
- **Cut the map selector / second map** — the alternative trade offered; declined.
- **Keep seven days and accept a poorer result** — rejected: undelivered scope is
  worse than an honest extension.

### Consequences
- ✅ Nothing is silently dropped; the schedule absorbed the new scope instead.
- ✅ Days 1–7 remain as originally planned, so existing work stays valid.
- ✅ Documented effort totals are now realistic against the available hours.
- ⚠️ **This supersedes the seven-day framing used throughout the docs**; references
  have been updated, and any remaining "seven-day" mentions are stale.
- ⚠️ Farms, achievements and audio stayed out of this phase (DW-B01, DW-B02, DW-B06).

### Related
[`milestones.md`](milestones.md), [`task-board.md`](task-board.md),
[`roadmap.md`](roadmap.md), [`daily-log.md`](daily-log.md).

---

## ADR-0015 — Private 1:1 conversations; group conversations only in Altars


> **Superseded 2026-11-13.** Dwelling supports **one-to-one conversations
> only**; there are no group conversations and an Altar is not a conversation
> venue. The "more than two members belongs to an Altar" clause below therefore
> no longer applies. The 1:1 privacy rule survives unchanged in
> [ADR-0020](#adr-0020--one-to-one-conversations-only-no-group-conversations-or-altars).
> The original text is kept so the history stays readable.

### Context
The owner stated the rule: a 1:1 conversation is only between those two people,
and more than two people share a conversation only in a group space. The existing
Prisma schema already supported this via `ConversationMember` and `Altar`/`AltarMembership`.

### Decision
Direct messages are strictly **one-to-one**: `Conversation` holds exactly two
participants (`userOneId`, `userTwoId`) with canonical `userOneId < userTwoId`
ordering. More than two people share a conversation **only inside an Altar**, and
every group conversation belongs to an Altar.

Timing, per [`plan.md`](plan.md):

- **Phases 0–11** deliver direct messages on the five-model schema (`User`,
  `Dwelling`, `Contact`, `Conversation`, `Message`). Altar behavior is not built
  here.
- **Phase 12 (PR-85…PR-92)** delivers Altars: `Altar` + `AltarMembership`, a
group conversation per Altar, and `ConversationMember` for group participants.
- The legacy `ConversationMember`/`Altar`/`AltarMembership` tables are dropped at
  PR-15/PR-16 because their shape predates this decision; Phase 12 reintroduces
  Altar support in a redesigned shape with its own migration. Nothing is lost —
  no database or migration history exists.

### Alternatives considered
- **Drop Altars permanently** — rejected by the owner: Altars are part of the
  product vision, not a discarded sketch.
- **Keep the legacy tables unchanged through the five-model migration** —
  rejected: they cannot express the canonical direct pair without ambiguity and
  would ship unused tables into the direct-message phase.
- **Build Altars before direct messages** — rejected: direct messages are the
  first product milestone and the foundation for auth, contacts, and realtime.

### Consequences
- ✅ Direct conversations need no join table; the pair is provably unique.
- ✅ Altars stay on the roadmap with a concrete phase and PR range.
- ⚠️ Phase 12 alters `Conversation` (kind discriminator, nullable columns) and
  reintroduces `ConversationMember` for groups only.
- ⚠️ Group messages require Altar-membership authorization; membership is checked
  in the backend service, not by a database constraint.
- ⚠️ Altars are outside the 84-PR direct-message scope and outside the MVP subset
  in the plan's deadline note.

### Related
[`../project/requirements.md`](../project/requirements.md), [`../architecture/database.md`](../architecture/database.md), [`task-board.md`](task-board.md), [`plan.md`](plan.md).

---

## ADR-0016 — React as the UI framework with Phaser for the 2D world

**Status:** Accepted
**Date:** 2026-10-17

### Context
The project needs a 2D rendered world with a conventional web UI. The original
stack used vanilla JavaScript + Phaser 3, but the decision was made to adopt
React as the UI framework while keeping Phaser 3 for the 2D world.

### Decision
Frontend is **React 18** with **Vite** and **@vitejs/plugin-react**, keeping
**Phaser 3** for the 2D world. The Phaser canvas renders the world only, while
React components render the HTML/CSS UI panels, HUD, and chat interface. The two
sides communicate through a bridge module (see ADR-0005), not by reaching into
each other's internals.

### Alternatives considered
- **Vanilla JavaScript + Phaser 3** — the original approach, but UI state and DOM
  updates became verbose and error-prone without a component model. React's
  declarative UI and component composition simplify the two-panel layout, HUD,
  and chat interface.
- **React + TypeScript** — stronger contracts, but the project default is Vanilla
  JS within React components. TypeScript is optional and can be added later.
- **Full React + TypeScript + Vite** — adds a build/type layer the project may
  not need immediately, but provides stronger IDE support and runtime safety.
- **Vue or Svelte as the UI framework** — comparable component models, but the
  team is already familiar with the React ecosystem.

### Consequences
- ✅ Declarative UI and component composition simplify the two-panel layout, HUD,
  and chat interface.
- ✅ React's virtual DOM and state management reduce boilerplate for panel
  visibility, HUD updates, and chat message rendering.
- ✅ Direct DOM access for the HTML UI, which keeps the canvas/DOM bridge
  intentional and well-defined (see ADR-0005).
- ✅ Phaser scenes remain the single source of truth for world state; React
  never queries Phaser's internals directly.
- ⚠️ Two rendering models (React virtual DOM + Phaser canvas) exist side-by-side.
  The bridge must be carefully designed to avoid conflicts.
- ⚠️ Requires careful coordination between React component lifecycle and Phaser
  scene lifecycle (mount/unmount timing, resize handling).
- ⚠️ Bundle size increases slightly with React dependencies (≈100 kB gzipped).
- ⚠️ This decision supersedes ADR-0002.

### Related
[`development/coding-conventions.md`](../development/coding-conventions.md),
[`architecture/frontend.md`](../architecture/frontend.md),
[`design/ui-ux.md`](../design/ui-ux.md),
[`milestones.md`](milestones.md), [`task-board.md`](task-board.md).

---

## ADR-0017 — Fullscreen immersive canvas with slide-out chat drawer on house interaction

**Status:** Accepted (confirmed by project owner 2026-10-17)
**Date:** 2026-10-17

### Context
The initial prototype used a fixed `max-width: 1200px` container with a permanent two-column CSS grid splitting the screen into a left game panel and a right conversation panel. This restricted the Phaser viewport to a small portion of the screen, creating large empty white areas and feeling like an administrative dashboard rather than an immersive 16-bit virtual world. The project owner explicitly confirmed:
> "I want the screen to cover screen fully and chat opens when we click on a house . make change in docs too"

### Decision
1. **Fullscreen edge-to-edge canvas:** The game canvas fills `100vw × 100vh` edge-to-edge without page margin, header box, or letterboxing bars.
2. **Floating glass HUD:** Essential titles and interaction hints float minimally in the top-left using dark semi-transparent glassmorphism (`backdrop-filter: blur(12px)`).
3. **Slide-out chat drawer on house interaction:** The conversation panel becomes an overlay drawer docked to the right edge (`position: fixed`). It is hidden by default (`transform: translateX(100%)`).
4. **Trigger mechanism:** Clicking on any dwelling house (or pressing `E` when standing adjacent to it) publishes `dwelling:interact` on the bridge (ADR-0005), which slides open the drawer populated with that dwelling's resident information.
5. **Dismissal & Focus:** The drawer can be dismissed by pressing `Escape` or clicking the close button (✕), immediately restoring keyboard focus to the game canvas for seamless movement.
6. **Mock labelling preserved:** FR-033 is preserved with an amber banner explicitly stating mock data.

### Alternatives considered
- **Permanent side-by-side columns (ADR-0013 / ADR-0005):** Superseded because it drastically reduces the game world's visible area and immersion.
- **Center modal dialogue:** Covers the center of the world and blocks the player character from view; a slide-out drawer keeps the world visible and interactable.

### Consequences
- ✅ Deeply immersive fullscreen gameplay experience.
- ✅ Clicking houses directly opens the conversation drawer with resident details.
- ✅ The game world stays fully visible and responsive.
- ✅ Keyboard focus rules remain clear (`Escape` or close button refocuses game).
- ⚠️ Supersedes the two-column static layout aspects of ADR-0005 and ADR-0013.

### Related
[`architecture/frontend.md`](../architecture/frontend.md),
[`design/ui-ux.md`](../design/ui-ux.md),
[`milestones.md`](milestones.md),
[`task-board.md`](task-board.md).

---

## ADR-0018 — Map data format and registry, reused-scene loading

**Status:** Accepted
**Date:** 2026-10-19

### Context
DW-032/DW-033 needed a data shape for maps and a loading strategy. The single
world had dwelling and obstacle coordinates inline in `WorldScene`, and a map
switch had to avoid recreating the Phaser game or duplicating listeners and
colliders.

### Decision
1. **Map data is plain JavaScript.** Each map lives in `frontend/src/world/maps/`
   and exports `{ id, name, range, size: { columns, rows }, groundTile?, spawn,
   dwellings, doors, obstacles, altar }`. All positions are world pixels; `size`
   is in tiles. `TILE_SIZE`, the viewport and the default ground frame stay in
   `world/constants.js`.
2. **Validate at registration.** `maps/format.js` documents the contract and
   returns human-readable errors. `maps/index.js` holds a registry
   (`registerMap`, `getMap`, `getDefaultMap`, `listMaps`). Invalid or duplicate
   maps are rejected with a console error/warning; unknown ids return `null`.
3. **One scene, explicit lifecycle.** `WorldScene` is never restarted. `loadMap`
   resolves the id, clears map-owned objects (`clearMap`), rebuilds ground,
   obstacles and dwellings from data, repositions the reused player, resets
   physics/camera bounds, and clears the active prompt. The player, the static
   group and the single player↔obstacles collider are reused.
4. **The bridge owns coordination.** The scene publishes `map:changed` with
   `{ id, name, range }`; React renders the HUD from it. The selector publishes
   `map:switch` with `mapId`; the scene confirms the result through
   `map:changed`. React never reads scene internals.

### Alternatives considered
- **Restart the scene per map** — risks duplicate listeners/colliders and makes
  the player/collider lifecycle harder to reason about.
- **One scene subclass per map** — duplicates logic and makes adding a map a code
  change, violating FR-018.
- **Hard-code each map in `WorldScene` with a switch statement** — rejected for
  the same reason.
- **Let React hold the active map as the source of truth** — contradicts the
  documented rule that world state lives in Phaser and UI state syncs through
  the bridge.

### Consequences
- ✅ Adding a map is a data file plus one `registerMap` call; `WorldScene` is
  untouched. A runtime-registered third map was switched to during verification.
- ✅ Repeated switches keep one canvas, one collider and stable display-object
  counts (10-switch test).
- ✅ Unknown ids leave the current map running and re-publish it to the HUD.
- ⚠️ `doors` and `altar` are part of the format but not rendered yet; M8/M9 own
  their behaviour.
- ⚠️ Maps larger than the 800×400 viewport are required until camera zoom or a
  smaller-world rule exists.
- ⚠️ Legacy M5 contacts do not match the `a-c` letter range; see ADR-0006.

### Related
[`design/maps.md`](../design/maps.md),
[`architecture/frontend.md`](../architecture/frontend.md),
[`milestones.md`](milestones.md) (M6), FR-017–FR-021.

---

## ADR-0019 — Use the supplied Sunnyside World and Sprout Lands packs as primary art

**Status:** Accepted
**Date:** 2026-11-12

### Context
Two complete, professionally drawn asset packs were supplied in the repository
root: **Sunnyside World V2.1** by Daniel Diggle and the **Sprout Lands Basic
pack** by Cup Nooble. Until now the world used CC0 Kenney placeholder sheets
(ADR-0007, ADR-0011), which were functional but not the art the project is meant
to ship with. The brief requires the supplied assets to be used, not replaced,
recreated or left as coloured-rectangle placeholders.

An audit found that Sunnyside supplies a 1024×1024 16 px world tileset, modular
buildings, five complete 32×56 cottages, trees, rocks, furniture, UI and layered
human characters — but its humans are **single-facing**, so they cannot drive a
four-direction player. Sprout Lands supplies a verified 4-direction 48×48
character sheet, plus fences, house parts and furniture.

### Decision
Use the supplied packs as the primary visual source:

1. **Sunnyside World** builds the world — grass ground (tileset frame 65),
   cottage dwellings (processed crops), trees and rocks (processed crops), UI
   portraits.
2. **Sprout Lands** supplies the player (`Basic Charakter Spritesheet.png`, 48×48
   frames, rows down/up/right/left) and fence tiles.
3. Assets are copied verbatim into `frontend/public/assets/`; crops are separate
   processed files and the pack folders are never modified.
4. Loading stays centralised in `world/assets.js`; animations are registered once
   in `PreloadScene`.
5. Map data references texture keys (`sprite`) rather than tileset frame indices
   for dwellings and obstacles.
6. The Kenney sheets stay on disk but are removed from the manifest.

### Alternatives considered
- **Stay on Kenney placeholders** — ignores the supplied assets and the brief.
- **Use Sunnyside humans for the player** — single facing fails FR-009.
- **Composite Sunnyside bodies + hair for the player** — still single-facing.
- **Assemble houses from modular roof/wall tiles** — the sheets are exploded
  kits; assembling them reliably is far slower than cropping the complete
  cottages the artist already arranged.
- **Generate new art** — explicitly forbidden while suitable supplied art exists.

### Consequences
- ✅ Every runtime visual now comes from a supplied pack; no generic placeholder
  rectangles remain.
- ✅ Adding a dwelling or prop is a data change plus a texture key.
- ✅ Sprite grids were inspected rather than assumed (48×48 player, 16×16 world,
  32×56 cottages).
- ⚠️ **Licence:** Sprout Lands is non-commercial and forbids redistributing the
  pack itself; credit is required and recorded in
  `frontend/public/assets/CREDITS.md`. The project must stay non-commercial, and
  publishing the repository as an asset source is not permitted.
- ⚠️ Two packs are mixed: palettes are close but not identical. Sunnyside owns
  the world, Sprout Lands only the player and fences, which limits the clash.
- ⚠️ Cottages are 32×56 against a 16 px grid, so a dwelling is a sprite, not a
  tile rectangle; collision bodies are therefore explicit, not tile-derived.
- ⚠️ The 32 px Sunnyside forest tileset and all audio remain unused.

### Related
[`design/asset-inventory.md`](../design/asset-inventory.md),
[`design/assets.md`](../design/assets.md),
[`../../frontend/public/assets/CREDITS.md`](../../frontend/public/assets/CREDITS.md),
FR-002, FR-009, FR-010, NFR-014.

---


---

## ADR-0022 — JWT authentication using an HttpOnly cookie

**Status:** Accepted
**Date:** 2026-11-14

### Context

Authentication was the largest open question in
[`../architecture/security-and-caching.md`](../architecture/security-and-caching.md):
"session cookies vs. tokens" was undecided while the approved roadmap already
assumed a JWT (`JWT_SECRET` is required at boot in
`backend/src/config/env.js`) and an httpOnly cookie (PR-19 and PR-21). The API
contract could not define signup, login, logout, or `/api/auth/me` without
settling where the credential lives.

The two realistic options for a single-page frontend talking to the same Express
backend are a bearer token held by JavaScript or a token in an `HttpOnly` cookie.
JavaScript-held tokens are readable by any script on the page, so an XSS bug
becomes full account takeover. Cookies are not readable by script, but they are
sent automatically by the browser, which reintroduces CSRF.

### Decision

1. **The session credential is a signed JWT**, `HS256`, signed with `JWT_SECRET`
   from the environment. Claims: `sub` (user id), `iat`, `exp`. No profile fields
   or roles are stored in the token.
2. **It is delivered only in an `HttpOnly` cookie** named `dwelling_session`,
   with `SameSite=Lax`, `Secure` in production, `Path=/`, and `Max-Age` equal to
   the token lifetime. JavaScript never reads or writes it, and it is never put
   in `localStorage`, `sessionStorage`, or a response body.
3. **The v1 lifetime is seven days**, fixed at issue. There is no refresh token
   and no sliding expiration. Re-authenticating replaces the cookie.
4. **Logout clears the cookie and does not revoke the token.** A stateless JWT
   cannot be invalidated by deleting a cookie, so an already-issued token —
   including a copied one — remains valid until `exp`. There is no denylist,
   token-version column, or password-change invalidation in v1; revocation needs
   its own decision and implementation.
5. **CSRF is handled at the transport boundary, without a token in v1.**
   Every state-changing request must use `Content-Type: application/json`, and a
   request that relies on the session cookie must carry an `Origin`/`Referer`
   matching `CLIENT_ORIGIN`; the server rejects everything else. `SameSite=Lax`
   is an additional layer, **not** a complete defense: it
   does not cover same-site subdomains or XSS, and it prevents the cookie from
   being sent at all if the frontend and API are deployed on different sites.
6. **A cross-site deployment requires reassessment.** Moving to
   `SameSite=None; Secure` removes the built-in protection and makes a CSRF
   token mandatory. The token mechanism is deferred (OQ-13), and the deployment
   topology is unresolved (OQ-14); neither is silently assumed.
7. **Identity always comes from the verified cookie.** A `userId`, `senderId`, or
   role in a body or query is untrusted input, never proof of identity. Socket
   authentication is not covered here; PR-60 reuses this cookie at handshake time
   and must define origin checks.

### Alternatives considered

- **Bearer JWT in memory or `localStorage`** — rejected: any XSS can read the
  token and exfiltrate a long-lived credential, and it contradicts PR-19/PR-21.
- **Server-side sessions in Redis with an opaque cookie** — viable and would make
  logout truly revocable, but it adds a session store and a lookup on every
  request before any session exists; rejected for v1, and still possible later
  by replacing the cookie's value without changing the HTTP contract.
- **`SameSite=Strict`** — stronger against CSRF but blocks the cookie on ordinary
  top-level navigations into the app, which makes "open a link while signed in"
  behave as signed out.
- **`SameSite=None; Secure` plus a CSRF token now** — the correct end state for a
  split-origin deployment, but it hardens against a topology that is not decided
  yet; deferred rather than guessed.
- **Short-lived access token with refresh rotation** — more machinery than a
  two-person-world v1 needs, and revocation still needs a store.

### Consequences

- ✅ The credential is unreadable by JavaScript, so an XSS bug cannot directly
  steal the session cookie.
- ✅ The HTTP contract has one identity mechanism (ADR-0022), consistent with
  `JWT_SECRET` and the auth PRs in [`../../plan.md`](../../plan.md).
- ✅ No token storage decision is left to frontend code.
- ⚠️ **Logout is not revocation.** Closing a session on one device cannot end it
  on another, and a stolen cookie works until `exp`. This is documented in
  [`../api/README.md`](../api/README.md) rather than hidden.
- ⚠️ CSRF protection depends on the JSON content type, the `Origin` check, and
  `SameSite=Lax`; none alone is sufficient, and a cross-site deploy invalidates
  the `Lax` assumption.
- ⚠️ A password change does not invalidate existing sessions in v1.
- ⚠️ Nothing is implemented: PR-19 adds the dependencies, PR-21 the token and
  cookie helpers, PR-22 the middleware. The cookie name and attributes are fixed
  now so the frontend and socket layers can be built against them.

### Related

[`../api/README.md`](../api/README.md) (auth contract),
[`../architecture/security-and-caching.md`](../architecture/security-and-caching.md),
[`../../plan.md`](../../plan.md) (PR-19–PR-29, PR-60),
[`daily-log.md`](daily-log.md).

---

## Adding an ADR

1. Take the next free `ADR-NNNN` number; never reuse one.
2. Fill in Status, Date, Context, Decision, Alternatives considered,
   Consequences.
3. Add it to the index table.
4. If it supersedes an earlier record, mark that record `Superseded by ADR-NNNN`.
5. Reference it from the relevant design or architecture document, and from the
   day's entry in [`daily-log.md`](daily-log.md).
