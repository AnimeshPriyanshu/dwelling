# Daily Log

A short, dated record of what actually happened. One entry per working day.
Entries describe reality — including blocks and unfinished work — not intentions.

**Rules**

- Write the entry the same day you work, even if the day went badly.
- Log what is **verifiable**, with a command or an observation.
- Only mark a task `Done` here when its acceptance criteria are met in
  [`milestones.md`](milestones.md), and update
  [`task-board.md`](task-board.md) in the same session.
- Decisions that are hard to reverse get an ADR in
  [`decisions.md`](decisions.md) and a one-line link here.

## Entry template

Copy this block for each new day:

```markdown
## YYYY-MM-DD — Day N: <milestone title>

**Status:** <on track / partially complete / blocked>
**Focus task(s):** DW-XXX, DW-XXX

### Completed
- <What actually works now, with evidence (command run, behavior observed).>

### Problems encountered
- <What went wrong, what you tried, where it stands.>

### Decisions made
- <Short form here; add an ADR in decisions.md if it is hard to reverse.>

### Next day's priority
1. <The single most important thing to do next.>
2. <Second priority.>

**Tasks moved to Done:** DW-XXX
**Tasks moved to Blocked:** DW-XXX (reason)
```

---

## Historical entries

These are reconstructed from the repository's git history and describe work
that is **already committed**. They are dated by commit date.

### 2026-09-20 — Day 0: Initial scaffold

**Status:** complete (committed)
**Commit:** `2f176e2 Initial commit`

**Completed**
- npm-workspace monorepo created with `frontend`, `backend`, `database`,
  `shared`.
- Frontend: Vite + vanilla JS shell (`frontend/src/main.js`) with World and
  Conversations panels, `index.html`, base CSS, and a Vite dev proxy for
  `/api` and `/socket.io`.
- Backend: Express app with `GET /api/health`, env config loading root `.env`,
  Socket.IO wiring emitting `server:ready`, optional Redis cache module, Prisma
  client singleton.
- Database: Prisma schema with `User`, `Dwelling`, `Conversation`,
  `ConversationMember`, `Message`, `Altar`, `AltarMembership`.
- Docs: `docs/architecture.md`.

**Problems encountered**
- None recorded. No migrations were generated for the Prisma schema.

**Decisions made**
- Chose an npm-workspace monorepo; see ADR-0001.
- Chose vanilla JavaScript + Phaser 3 over a framework; see ADR-0002.

**Next day's priority**
1. Establish the world module inside the frontend.

---

### 2026-09-20 — Day 0 (continued): Project README

**Status:** complete (committed)
**Commit:** `b9964a4 Add README for Dwelling project`

**Completed**
- Root `README.md` documenting the concept, contacts, alphabet-based maps, and
  Altars.

**Next day's priority**
1. Organize the workspace folders.

---

### 2026-09-28 — Day 0 (continued): Folder structure

**Status:** complete (committed)
**Commit:** `8dfe644 ADDED: Folder structure`

**Completed**
- Boundary folders with READMEs: `frontend/src/world/`, `frontend/src/chat/`,
  `backend/src/routes/`, `backend/src/sockets/`, `backend/src/cache/`,
  `backend/src/db/`, plus `tests/` and `scripts/` placeholders.

**Problems encountered**
- These are documentation-only placeholders — **no gameplay code exists yet**.
  Confirmed by inspection: `frontend/src/world/` and `frontend/src/chat/`
  contain only `README.md`.

**Next day's priority**
1. Start Milestone 1 (DW-001).

---

## 2026-10-17 — Requirements session and plan revision

**Status:** complete (planning only — no code written)
**Focus:** defining the visual direction, asset approach, and scope before building

### Completed
- Inspected the repository again and **verified the asset inventory**: only `public/favicon.svg`, `public/icons.svg` and three unused Vite starter leftovers exist. **No sprites, tilesets, houses, furniture, Altar art, fonts or audio.** `frontend/public/assets/` does not exist.
- Confirmed the toolchain actually works: `vite@8.3.1` and `phaser@3.90.0` installed, `npm run build` passes. Phaser has still never rendered.
- Ran a structured requirements session in five question groups covering visual style, world mechanics, assets, UI, chat and constraints.
- Agreed the direction: **16-bit pixel art**, top-down with a **slight 3/4 tilt**, **cozy warm** palette; **WASD + arrows**; camera follows and is clamped; **separate maps** with a selector; approach → prompt → `E`; **house interiors** with fireplace, kitchen and bed; **Altar as scenery**; **docked conversation sidebar** with labelled mock data; **minimal HUD**; desktop-first; alone, 4–6 h/day.

### Problems encountered
- **No image generator is available in this environment.** The owner's first choice was "you generate the assets"; checking the environment showed no Pillow, no ImageMagick, no `sharp`/`canvas`/`pngjs` — only `ffmpeg` and Python's `zlib` + `struct`. This was raised immediately rather than after promising generated art, and the plan changed to CC0 packs plus code-authored art.
- **Scope exceeded the seven-day budget.** Interiors plus the confirmed map selector roughly matched the whole original allotment on their own. Presented honestly with three options; the owner chose to **extend the schedule to ten days** rather than cut either feature.
- `DW-019` (walk animation) had been `Blocked` because no sprite sheet existed. Sourcing one (DW-047) resolves the cause rather than the symptom.

### Decisions made
- **ADR-0010** — 16-bit pixel art, top-down 3/4 tilt, cozy palette.
- **ADR-0011** — hybrid assets: CC0 packs for tiles/houses/furniture, code-authored for Dwelling-specific pieces, with licence verification and `CREDITS.md`.
- **ADR-0012** — interiors as **one shared room template** behind a door trigger.
- **ADR-0013** — chat as a **docked sidebar** replacing the Conversations panel, with mock data labelled as mock.
- **ADR-0014** — the **ten-day schedule supersedes the seven-day plan**.
- **ADR-0015** — 1:1 conversations are private; more than two people share a conversation only in an Altar group space.
- Deferred by choice: **farms** (DW-B01), **achievements** (DW-B02), audio (DW-B06), touch controls (DW-B07).
- Plan grew from **43 tasks (~35 h)** to **59 tasks (~54 h)** across **10 days**.

### Next day's priority
1. **DW-002** — prove Phaser actually renders under Vite (the one assumption never tested).
2. **DW-001 / DW-003** — record the current structure, then create `world/game.js`.
3. **DW-044** — source the CC0 asset packs, since Day 2's rendering depends on them.

**Tasks moved to Done:** none — planning only, no code written
**Tasks added:** DW-044 to DW-059

---

## Upcoming entries

Entries are added as the ten-day plan is executed:

| Day | Planned date | Milestone | Entry written? |
| --- | --- | --- | --- |
| Day 1 | _(fill in)_ | Foundation and project structure | No |
| Day 2 | _(fill in)_ | World rendering and the asset pipeline | No |
| Day 3 | _(fill in)_ | Player movement | No |
| Day 4 | _(fill in)_ | Collision and camera | No |
| Day 5 | _(fill in)_ | Dwellings and interactions | No |
| Day 6 | _(fill in)_ | Maps, second map and HUD | No |
| Day 7 | _(fill in)_ | DOM bridge and conversation sidebar | No |
| Day 8 | _(fill in)_ | House interiors | No |
| Day 9 | _(fill in)_ | Altar and polish | No |
| Day 10 | _(fill in)_ | Integration and review | No |

> Fill in the planned date for each day as you schedule it. The original
> scaffold was committed on **2026-09-20** and the folder structure on
> **2026-09-28**; the ten-day plan starts from the current working day.
