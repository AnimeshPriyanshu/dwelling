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

## 2026-10-17 — Day 1: Foundation and project structure

**Status:** complete (Milestone 1 accepted; verified by running the app)
**Focus task(s):** DW-001, DW-002, DW-003, DW-004, DW-005, DW-006, DW-007
**Commit:** _(pending)_

### Completed
- **DW-001** — Recorded the structure and tooling. Verified: npm workspaces, `vite@8.3.1`, `phaser@3.90.0`, React 18.3 in use (ADR-0016).
- **DW-002** — Proved Phaser renders under Vite. Headless Chrome (`--dump-dom`, `--virtual-time-budget`) shows Phaser v3.90.0 booting and a `<canvas width="800" height="400">` mounted inside `#world`; page console shows only the Phaser banner and the React DevTools notice — no errors.
- **DW-003** — Added `frontend/src/world/game.js` exporting `createGame(parent)` with the sole Phaser config (canvas, `Scale.FIT`, arcade physics, scene list).
- **DW-004** — Added `frontend/src/world/scenes/BootScene.js` and `PreloadScene.js` as `Phaser.Scene` subclasses.
- **DW-005** — Added `frontend/src/world/scenes/WorldScene.js` (placeholder background + label as visible proof) and registered `[BootScene, PreloadScene, WorldScene]` in the config.
- **DW-006** — `frontend/src/App.jsx` is now the React shell: it mounts the game via `createGame()` in a `useEffect` and destroys it on unmount, keeping the World panel and the Conversations sidebar. `main.js` renders `<App>`.
- **DW-007** — `npm run build` passes (19 modules, ~300 ms); `npm run dev` serves `http://localhost:5173` (HTTP 200) with Phaser mounted.

### Problems encountered
- **Broken pre-existing wiring.** `App.jsx` passed React function components (`WorldScene.jsx`, `ChatScene.jsx`) into Phaser's `scene` array; Phaser instantiates scenes with `new`, which throws for arrow-function components, so the app crashed on load. Removed both files and replaced them with real `Phaser.Scene` subclasses under `world/scenes/`.
- **`#app` vs `#root`.** `main.js` mounted to `#root` while `index.html` and `style.css` used `#app`. Fixed in `index.html` and `style.css`.
- **React StrictMode double-mount.** The effect runs twice in dev, so Phaser booted twice and briefly left two canvases. The cleanup now calls `game.destroy(true, true)` **and** `container.replaceChildren()`, leaving exactly one canvas.
- **Stray Vite config.** Removed the non-functional top-level `jsx: { jsxPragma, ... }` block; `@vitejs/plugin-react` handles JSX in `.jsx` files.

### Decisions made
- **React is the integration shape** (already recorded as ADR-0016): the Phaser game is created by a `createGame()` factory and mounted from a React `useEffect`, not from a global script. No new ADR needed.

### Next day's priority
1. **DW-044** — source the CC0 asset packs (ground tileset, houses, props, furniture); Day 2's rendering depends on them.
2. **DW-011 / DW-046** — create `frontend/public/assets/` and the `world/assets.js` key module.
3. **DW-008 / DW-009** — define world constants and render the first ground layer.

**Tasks moved to Done:** DW-001, DW-002, DW-003, DW-004, DW-005, DW-006, DW-007

---

## 2026-10-17 — Day 2: World rendering and the asset pipeline

**Status:** complete (Milestone 2 accepted; verified in a real browser)
**Focus task(s):** DW-044, DW-045, DW-046, DW-008, DW-009, DW-010, DW-011, DW-012, DW-013
**Commit:** _(pending)_

### Completed
- **DW-044** — Sourced two **CC0** packs, both by Kenney: **Tiny Town** (ground, houses, props, trees) and **Tiny Dungeon** (interior furniture). Downloaded as zips from OpenGameArt; recorded archive SHA-256s.
- **DW-045** — Wrote `frontend/public/assets/CREDITS.md`: pack, author, license (CC0 1.0 with URL), source pages, download URL, archive SHA-256, files used, and per-file SHA-256.
- **DW-046** — Added `frontend/src/world/assets.js`: `TEXTURES`, `ASSET_PATHS`, a declarative `ASSET_MANIFEST` (with a `required` flag) and a `loadAssets(scene)` helper. Scenes never hard-code paths.
- **DW-008** — Added `frontend/src/world/constants.js`: `TILE_SIZE = 16`, world size `60×40` tiles → `WORLD_WIDTH/HEIGHT = 960×640`, viewport `800×400`, `GROUND_TILE_INDEX = 0`.
- **DW-009** — `WorldScene` now builds a data-driven tilemap (`60×40` of tile index 0) and renders a ground layer from `tiny-town.png`. The Day 1 placeholder rectangle is gone.
- **DW-010** — Physics world bounds and camera bounds are both set to `(0,0,960,640)` from the constants.
- **DW-011** — Created `frontend/public/assets/` with `tilesets/` (both sheets), `README.md` (layout, naming, how to add, ≤512 KB rule) and `CREDITS.md`.
- **DW-012** — `PreloadScene` shows a progress bar, loads the manifest, then checks every entry against the texture manager: missing **required** → `console.error`; missing **optional** → `console.warn`; always transitions to `WorldScene`.
- **DW-013** — `npm run build` passes (21 modules, ~330 ms) and `vite preview` serves the built app; both verified.

### Evidence (browser + build, not just the build)
- Headless Chrome via the DevTools Protocol, on **dev** and on **`vite preview`** (production): canvas centre and all four corners sample `rgb(132,198,105)` — the plain-grass tile. The world fills the view.
- Bounds via the running game: `physicsBounds == cameraBounds == (0,0,960,640)`; view `800×400`; `maxScroll = (160,240)`. `setScroll(99999,99999)` clamps to `(160,240)`; `setScroll(-50,-50)` clamps to `(0,0)`.
- Asset HTTP: `assets/tilesets/tiny-town.png` → `200` (5042 B), `tiny-dungeon.png` → `200` (5294 B); both ≤ 512 KB. No failed requests, no console errors in the normal case.
- Missing-asset tests: optional (`tiny-dungeon`) removed → world still renders grass, `[assets] optional asset missing` warning. Required (`tiny-town`) removed → fallback ground `rgb(47,59,50)`, `[assets] required asset missing` error, no crash and no stuck loading screen.

### Problems encountered
- **A full progress bar was not proof of success.** Headless `--screenshot` (even with a 20 s virtual-time budget) captured the loading screen at the transition boundary. Real diagnosis needed the DevTools Protocol; it showed the world rendering correctly. Lesson recorded: do not trust a screenshot alone for scene transitions.
- **Phaser does not raise `loaderror` for a 404 image.** A missing image fails in Phaser's *process* stage, which only logs its own `Failed to process file`. The manifest's required/optional handling was moved to a texture-existence check in `PreloadScene.create()`, which is reliable.
- **Default `/favicon.ico` 404.** Added `<link rel="icon" href="/favicon.svg">` to `index.html`; the failed-request list is now empty.
- **Chrome-vs-Phaser renderer.** Headless Chrome has no WebGL, so Phaser falls back to the **Canvas** renderer there; a real browser will use WebGL. Behaviour is identical for this milestone.

### Decisions made
- **Assets: Kenney Tiny Town + Tiny Dungeon (CC0).** Single pack family keeps the 3/4-tilt pixel style coherent (ADR-0010/0011). No new ADR — the hybrid-asset ADR already covered CC0 packs.
- **Ground via a Phaser tilemap**, not a stretched tileSprite, so per-tile data (paths, props) can replace "all grass" in later milestones without reworking the layer.
- **Tiny Dungeon is loaded as an *optional* asset** — furnishing arrives in Milestone 8; it doubles as the graceful-missing-asset case.

### Next day's priority
1. **DW-047** — assemble a 4-direction player sprite sheet and register walk animations (unblocks DW-019).
2. **DW-014 / DW-015** — create the `Player` entity and keyboard input (arrow keys + WASD).
3. **DW-016** — delta-time, normalized-diagonal movement.

**Tasks moved to Done:** DW-044, DW-045, DW-046, DW-008, DW-009, DW-010, DW-011, DW-012, DW-013

---

## 2026-10-17 — Day 3: Player movement

**Status:** complete (Milestone 3 accepted; verified in headless browser)
**Focus task(s):** DW-047, DW-014, DW-015, DW-016, DW-017, DW-018, DW-019
**Commit:** _(pending)_

### Completed
- **DW-047** — Configured the 4-direction, 3-frame player spritesheet (16×24px per frame, 64×72px total) in `assets.js` as a spritesheet and registered four directional walk animations (`player-walk-down`, `player-walk-left`, `player-walk-right`, `player-walk-up`) at 8 FPS repeating.
- **DW-014** — Created `frontend/src/world/entities/Player.js` extending `Phaser.Physics.Arcade.Sprite`, mounted into `WorldScene` at center spawn `(480, 320)`.
- **DW-015** — Added dual keyboard inputs supporting both arrow keys and WASD.
- **DW-016** — Applied velocity-based movement with normalized diagonal speed (`dx *= 0.7071`, `dy *= 0.7071`), maintaining consistent 120 px/s velocity.
- **DW-017** — Implemented Shift key run toggle increasing speed by 1.6× to 192 px/s.
- **DW-018** — Facing direction is tracked (`down`, `left`, `right`, `up`) and sets corresponding idle frame when stationary.
- **DW-019** — Directional walk animations play smoothly while moving and stop on idle frame when input ceases.

### Problems encountered
- Assets pipeline had loaded `playerWalk` as a plain image rather than a spritesheet with frame dimensions. Corrected `ASSET_MANIFEST` in `assets.js` to `type: 'spritesheet', frameWidth: 16, frameHeight: 24`.

### Decisions made
- Walk animations are driven purely by input state and velocity in `update()` rather than animations driving physics coordinates.

### Next day's priority
1. **DW-020 / DW-021** — Add static obstacle props and collider with player.
2. **DW-022 / DW-023** — Implement camera follow clamped to world bounds.

**Tasks moved to Done:** DW-047, DW-014, DW-015, DW-016, DW-017, DW-018, DW-019

---

## 2026-10-17 — Day 4: Collision and camera

**Status:** complete (Milestone 4 accepted; verified by headless Chrome CDP and visual screenshot)
**Focus task(s):** DW-020, DW-021, DW-022, DW-023, DW-024, DW-025
**Commit:** _(pending)_

### Completed
- **DW-020** — Added a static obstacle group (`scene.obstacles = this.physics.add.staticGroup()`) with 24 authentic prop sprites from `tiny-town.png` including horizontal fence line (frames 80, 81, 82), vertical fence line, southern tree grove (frame 115), rocks (frame 106), and wood stumps (frame 93).
- **DW-021** — Registered an Arcade Physics collider between the player and the obstacle group (`this.physics.add.collider(this.player, this.obstacles)`). Set explicit 3/4-tilt collision body footprint (`12×12` with offset `(2, 12)`) on the player and matching bodies on obstacles.
- **DW-022** — Configured camera to follow the player smoothly with pixel rounding (`camera.startFollow(this.player, true, 0.1, 0.1)`).
- **DW-023** — Clamped camera bounds to `(0, 0, WORLD_WIDTH, WORLD_HEIGHT)`. Verified that camera never scrolls out of world bounds (stops at `scrollX = 0` west, `160` east, `scrollY = 0` north, `240` south).
- **DW-024** — Tested movement against world edges and obstacles using Chrome DevTools Protocol headless test script.
- **DW-025** — Verified diagonal wall sliding: player smoothly slides along fences without snagging, stops at all 4 world edges, and cannot penetrate obstacles.

### Evidence (browser + build)
- Automated CDP test script (`verify_m4.cjs`) connected to headless Chrome running the app:
  - Initial spawn: Player at `(480, 320)`, `collideWorldBounds: true`, camera centered with `scrollX: 80`, `scrollY: 120`.
  - Movement: Cardinal 120 px/s, diagonal 120 px/s, run 192 px/s.
  - Camera bounds: Clamped at `scrollX: 160` (east), `0` (west), `scrollY: 0` (north), `240` (south).
  - Collision: Player blocked moving up and down against obstacles; cannot pass through.
  - Wall sliding: Player sliding along horizontal fence moves from `x: 380` to `404` without sticking.
  - Screenshot captured and visually verified: `m4_verified_runtime.png`.
  - 0 console errors during play.
- `npm run build` succeeds (23 modules transformed in 310ms).

### Decisions made
- Player collision body uses bottom-half bounding box (`12×12` at offset `(2, 12)` on a `16×24` sprite) to match 3/4 perspective ground footprint.
- Obstacles are constructed as static arcade physics sprites from `tiny-town.png` tile frames, preparing for Milestone 6's map data format.
- **ADR-0017** — Fullscreen immersive canvas layout (`100vw × 100vh`) with slide-out overlay chat drawer triggered by clicking on a dwelling house (or pressing `E`), superseding the static two-column split layout.

### Next day's priority
1. **DW-026** — Create `world/entities/Dwelling.js` (house sprite + contact id + position).
2. **DW-027** — Place several dwellings in the world from a data list.
3. **DW-028 / DW-029** — Add interaction zones and visible prompts.

**Tasks moved to Done:** DW-020, DW-021, DW-022, DW-023, DW-024, DW-025

---

## Upcoming entries

Entries are added as the ten-day plan is executed:

| Day | Planned date | Milestone | Entry written? |
| --- | --- | --- | --- |
| Day 1 | 2026-10-17 | Foundation and project structure | Yes |
| Day 2 | 2026-10-17 | World rendering and the asset pipeline | Yes |
| Day 3 | 2026-10-17 | Player movement | Yes |
| Day 4 | 2026-10-17 | Collision and camera | Yes |
| Day 5 | _(fill in)_ | Dwellings and interactions | No |
| Day 6 | _(fill in)_ | Maps, second map and HUD | No |
| Day 7 | _(fill in)_ | DOM bridge and conversation sidebar | No |
| Day 8 | _(fill in)_ | House interiors | No |
| Day 9 | _(fill in)_ | Altar and polish | No |
| Day 10 | _(fill in)_ | Integration and review | No |

> Fill in the planned date for each day as you schedule it. The original
> scaffold was committed on **2026-09-20** and the folder structure on
> **2026-09-28**; the ten-day plan starts from the current working day.
