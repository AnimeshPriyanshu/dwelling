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

## 2026-10-18 — Day 5: Dwellings and interactions

**Status:** complete (Milestone 5 accepted; verified by headless Chrome CDP)
**Focus task(s):** DW-026, DW-027, DW-028, DW-029, DW-030, DW-031
**Commit:** _(pending)_

### Completed
- **DW-026** — Added `world/entities/Dwelling.js`: 2×2 house sprites from `tiny-town.png`, a static collision body, a click zone, a proximity prompt, and the interaction payload.
- **DW-027** — Dwellings are placed from the `DWELLING_DATA` list in `WorldScene`; four houses at distinct positions each carry a unique `id`/`contactId`, display name, resident, role, tile frames, and interaction radius.
- **DW-028** — Each dwelling owns a 48 px proximity zone checked against the player every frame.
- **DW-029** — A floating `[E] <Resident>` badge is shown only for the active dwelling and hidden as soon as the player leaves.
- **DW-030** — Pressing `E` inside a zone emits `dwelling:interact` on the scene and dispatches `dwelling:open-chat` with `{ id, contactId, name, contact, role }`.
- **DW-031** — The React shell listens for `dwelling:open-chat` and opens the conversation drawer with the matching resident and mock history.

### Evidence (browser + build)
- Runtime test (Vite dev server, headless Chrome + CDP, focus emulation enabled):
  - Dwellings at `(280,160)`, `(680,160)`, `(240,480)`, `(720,480)` with unique contact ids `contact-elowen`, `contact-rowan`, `contact-kael`, `contact-lyra`.
  - Approaching each showed exactly one prompt (`[E] Elowen`, `[E] Rowan`, `[E] Kael`, `[E] Lyra`) and the correct active contact id.
  - `E` at each dwelling produced the matching contact id and opened the drawer with the correct title, resident line, and mock message; `Esc` closed it.
  - Walking back to spawn cleared the active dwelling and all prompts.
  - Forced overlapping zones (radius 600) resolved to exactly one active dwelling, matching the closer dwelling in both directions.
  - Clicking each house opened the correct conversation.
  - `E` while moving (`x` 280 → 324) fired the correct contact and movement continued (no stall).
  - `E` outside every zone fired no event and opened nothing.
  - 0 console errors during the run.
- Dwelling collision body measured 30×24 at `(265,152)` after fixing static-body `refreshBody()` order (it had been silently reduced to 16×16).
- `npm run build` passes.

### Decisions made
- The badge names the resident/contact rather than the building, keeping it readable above a 32×32 house.
- Clicking and `E` share the same `Dwelling.interact()` path; clicking is a convenience, not a second interaction mode.
- The house body is 30×24 centred on the dwelling, leaving the roof walkable behind the facade.
- M5 wires the placeholder handler through a DOM `CustomEvent`; Milestone 7 moves this onto the `bridge/` module (ADR-0005).

### Next day's priority
1. **DW-032** — Extract map data (size, spawn, dwellings, obstacles) into a map format.
2. **DW-033** — Add a map registry and load a map by id.
3. **DW-034** — Add a map selector or portal and author the second map.
4. **DW-037** — Show the current map name in the HUD.

**Tasks moved to Done:** DW-026, DW-027, DW-028, DW-029, DW-030, DW-031

---

## 2026-10-19 — Day 6: Maps, second map and HUD

**Status:** complete (Milestone 6 accepted; verified by headless Chrome CDP)
**Focus task(s):** DW-032, DW-033, DW-034, DW-037
**Commit:** _(pending)_

### Completed
- **DW-032** — Added `frontend/src/world/maps/format.js` (documented map contract + validation) and moved every dwelling, obstacle, spawn, size and altar entry out of `WorldScene`. Starting map `a-c` (“Alder Creek”) preserves the four M5 dwelling ids, contact ids and collision bodies. Shared tile/viewport constants stay in `constants.js`; map size is per-map tile dimensions.
- **DW-033** — Added `frontend/src/world/maps/index.js`: `registerMap`, `getMap`, `getDefaultMap`, `listMaps`. Invalid/duplicate maps are rejected with console diagnostics; unknown ids return `null`.
- **DW-034** — Added the second map `s-u` (“Sunhollow”, 56×35) with its own spawn, two dwellings (`contact-sable`, `contact-tomas`), obstacles and altar data. The HUD selector publishes `map:switch`; `WorldScene.loadMap` clears map-owned objects and rebuilds from data on the same scene instance. Player, static group and the single player↔obstacles collider are reused.
- **DW-037** — The React HUD now shows the active map's name and range and lists registered maps in a keyboard-reachable `<select>`. It is fed by `map:changed` through the bridge; React never reads scene internals. A map change closes the chat drawer so no stale conversation survives the world swap.

### Evidence (browser + build)
- Runtime (Vite dev server, headless Chrome + CDP, focus emulation):
  - Default: `a-c` / Alder Creek / A–C, spawn `(480,320)`, world + camera bounds `960×640`, 4 dwellings, 28 static-group entries (24 props + 4 house bodies), 1 collider, altar `(480,560)`, HUD + selector correct.
  - HUD switch to `s-u`: map Sunhollow / S–U, spawn `(448,280)`, bounds `896×560`, 2 dwellings, 23 group entries (21 props + 2 house bodies), 1 collider, ground layer 56×35, altar `(448,488)`, HUD and selector updated. `performance` sentinel and navigation-entry count unchanged (no reload).
  - Prompt cleared on switch; a drawer open on Sunhollow closed when switching back to Alder Creek.
  - 10 repeated `a-c` ↔ `s-u` switches: display-object count stable (54 / 37), obstacles stable, colliders always 1, one canvas, no console errors.
  - Third map registered at runtime (`test-x`, Test Reach, X–Z, 55×30) and switched to without editing `WorldScene`; HUD and selector updated. Invalid and duplicate registration returned `false`; unknown `missing-map` left the current map running with a warning.
  - Existing M5 interaction still works after switches (Elowen at Redwood Cottage), and fence collision still blocks at `x=346`.
  - Real pointer clicks (CDP mouse events at camera-projected screen coordinates) opened Redwood Cottage on `a-c`, Sunhollow Cottage on `s-u`, and Cobalt Haven after switching back to `a-c`; the close button cleared the drawer each time.
- `npm run build` exits 0 (29 modules transformed).

### Decisions made
- **ADR-0018** — map data format + registry + reused-scene lifecycle.
- **ADR-0006** — moved to Accepted now that two alphabet maps load and switch.
- Map data is plain JS, not JSON, so it can be imported without a loader and validated at startup.
- Map switching closes the open conversation drawer; a conversation is tied to the map it was opened on.
- `doors` and `altar` are part of the data contract now but remain render-free until M8/M9.

### Known issues
- FR-017 is only partially satisfied: the four M5 contacts (E, K, L, R) stay on `a-c` with their original ids rather than being regrouped into their letter ranges. Renaming or relocating them would break preserved M5 interaction ids.

### Next day's priority
1. **DW-035** — settle the bridge API and move dwelling events onto it.
2. **DW-036** — conversation sidebar driven by the bridge.
3. **DW-048** — mock contacts/history, visibly labelled.
4. **DW-038** — input-focus rule while the panel is open.

**Tasks moved to Done:** DW-032, DW-033, DW-034, DW-037

---

## 2026-11-12 — Supplied asset audit and integration

**Focus task(s):** supplied asset packs (Sunnyside World, Sprout Lands)
**Status:** on track

### Summary
The two asset packs supplied in the repository root were audited and integrated.
The Kenney placeholder sheets are no longer loaded. Full inventory, mapping and
plan: [`../design/asset-inventory.md`](../design/asset-inventory.md).

### Work done
- Inspected both packs completely (images, sprite grids, UI, metadata); no audio
  and no Tiled/JSON map files are present. Sprite grids were verified by cropping
  and viewing, not assumed: Sunnyside world 1024×1024 at 16 px (64×64 tiles);
  Sprout Lands player 192×192 at 48×48, rows **down, up, left, right**;
  Sunnyside humans 96×64 per frame with **hair as a separate overlay layer**.
- Recorded licences: Sunnyside is free/commercial (educational redistribution
  allowed with a link); Sprout Lands is **non-commercial, credit required** and
  may not be redistributed as a pack.
- Copied four files verbatim and created processed copies: five 32×56 cottages
  and four prop crops from the Sunnyside tileset, plus seven composited contact
  portraits. Originals untouched.
- Rewrote `world/assets.js` around the supplied files; registered four 4-frame
  walk animations; moved the player to the 48×48 sheet; converted dwellings and
  obstacles to texture keys in map data; switched ground to Sunnyside frame 65;
  added depth sorting by object base; added contact avatars to the chat drawer.

### Verification (headless Chrome + CDP)
- All 13 runtime textures resolve; no failed requests, no console errors.
- Four animations exist with 4 frames at 8 FPS; real arrow-key input gives
  `player-walk-{right,up,left,down}` and the correct idle frame (8/4/12/0).
- `a-c`: 60×40 ground, every sampled tile index 65, 4 dwellings, 23 static bodies
  (4 house bodies + 19 props), player 48×48 with a 12×8 body.
- Real pointer click opens the drawer for “Redwood Cottage” with a loaded avatar.
- Switch to `s-u`: 56×35 ground, 2 dwellings, 20 static bodies, spawn (448, 300),
  HUD “Sunhollow · S–U”, one canvas; clicking opens “Tidewood Lodge”.
- `npm run build` exits 0.

### Decisions made
- **ADR-0019** — use the supplied packs as primary art; supersedes ADR-0007 and
  ADR-0011.
- Sprout Lands supplies the player (only pack with four verified directions);
  Sunnyside supplies the world, houses, props and portraits.

### Known issues
- NFR-014 is only partly met: Sprout Lands is non-commercial and forbids
  redistributing the pack, so the repository must not be published as an asset
  source while it contains those files.
- Sunnyside humans are single-facing; contact characters stay UI-only.
- Legacy Kenney files and `player-walk.png` remain on disk, unused.

### Next day's priority
1. Milestone 7 — bridge/sidebar, mock history and input focus.
2. Place fence runs using the supplied Sprout Lands fence sheet.
3. Interiors (M8) using the supplied furniture atlases.

---

## 2026-11-12 — Roads and denser woodland

**Focus task(s):** map composition (paths, forest density)
**Status:** on track

### Summary
Both exterior maps were re-composed as villages with real dirt roads and much
denser, clumped woodland. Layout is still data: maps declare `paths` rectangles,
and a seeded helper derives the obstacle list.

### Work done
- **Paths.** Verified the supplied kits for a path texture: Sprout Lands
  `Objects/Paths.png` is actually fence pieces (not paths); the usable ground
  texture is `Tilesets/Tilled_Dirt_v2.png` (176×112, 11×7 tiles of 16). Copied it
  to `public/assets/tilesets/sprout-dirt.png` and tone-matched it to the Sunnyside
  palette (`colorchannelmixer=rr=0.82:gg=0.70:bb=0.58`); grid and pixels otherwise
  unchanged.
- Added **path frames 12/56/67/68** (the fully opaque fill tiles) to the manifest
  and a `PATH_TILE_FRAMES` constant in `world/assets.js`.
- New `world/maps/terrain.js`: `buildPathCells` rasterises path rectangles;
  `scatterForest` / `scatterRocks` generate obstacles from an integer seed, with
  smooth value noise for clumps, a jittered 24 px grid, open verges near roads and
  clearings around dwellings, spawn and altar.
- `WorldScene.createPaths` draws the rasterised grid as a second tilemap layer at
  depth 1 (above grass, below every object), and destroys it on map switch.
- `format.js` validates the new optional `paths` array (integer tile rectangles,
  inside the map bounds).
- Re-authored both maps as villages: `a-c` has a crossroads, a south back lane and
  a spur to each cottage door (402 obstacles); `s-u` has a main lane, one spur and
  an L-shaped back lane (421 obstacles).

### Verification (headless Chrome + CDP)
- `a-c`: 60×40 ground, path layer present, tiles are exactly `{12, 56, 67, 68}`,
  379 static bodies, 60 FPS at the time of measurement.
- `s-u`: 56×35 ground, path layer present with the same four frames, 408 bodies,
  60–61 FPS.
- After the 2× houses: dwellings report 64×112 sprites with 46×20 bodies, clicks
  and the map switch still resolve, no console errors. Headless rAF later capped
  itself at 30 Hz (a plain `requestAnimationFrame` probe measured 30 too); with
  `--disable-frame-rate-limit` the same scene ran at **≈868 FPS**, so the cap was
  the browser, not the scene.
- Map switch through the HUD selector still repopulates without a reload; no
  console errors or warnings on either map.
- Screenshots checked at 1280×900: roads read as warm dirt against the grass and
  the woodland forms stands with open verges, visible ground and no lattice.
- `npm run build` exits 0.

### Follow-up (same day) — bigger houses, aligned paths
- Cottages were **32×56**, which read as sheds next to the 48×48 player. Re-cropped
  the same five Sunnyside tiles, then upscaled 2× with nearest-neighbour to
  **64×112**; each pixel is doubled, nothing is interpolated. Bodies scale with
  the sprite (46×20), prompt and click zone follow automatically, interaction
  radius raised to 76.
- Rebased both maps on the tile grid: dwelling `x` on a tile boundary, house base
  on a tile boundary, and every spur two tiles wide at `x/16 − 1` and `x/16`, so
  each path is centred on its door. A door meets the road at exactly one pixel.
- Mountain/House clearings now derive from `COTTAGE_FRAME` (`assets.js`), so tree
  scatter keeps its distance from the larger houses.
- `s-u`: moved Tidewood Lodge onto the back lane and ran the connector west of
  it, so no path is hidden underneath a house.

### Follow-up (same day) — farms
- Added fenced crop plots to both maps, built from supplied art only: Sunnyside
  has **harvested-produce icons**, not field plants, so the crops come from
  Sprout Lands `Objects/Basic_Plants.png` (6×2 frames of 16×16: wheat and a root
  crop, four growth stages, plus a seed packet and a harvested item). Soil is the
  same Sprout Lands tilled-dirt sheet the roads use, and the rail is the fence
  sheet that had been loaded but never placed.
- Farm layout lives in `world/farm.js` and map data (`farms: [{x,y,w,h,gate,crop}]`
  in tiles). Soil cells, fence frames and crop frames are all derived, so a map
  stores no pixel positions. Crops pick a growth stage from a cell hash, giving a
  patchwork field that looks identical on every load.
- The fence sheet's own vertical column does not tile (posts, no continuous
  rail), so side runs reuse the horizontal rail turned a quarter turn; posts and
  rails then line up exactly. Only the rail blocks movement (body 16×8 on a run,
  8×16 on a side).
- `a-c`: 8×6 wheat plot in the east meadow, gate on the north edge over a
  two-tile dirt threshold off the street. `s-u`: 7×5 root plot east of Tidewood
  Lodge, gate opening straight onto the back lane. Trees keep a one-tile verge
  around every plot.

### Verification
- `npm run build` exits 0.
- a-c: 393 static bodies (30 fence pieces replace 16 removed trees), 48 crop
  sprites, soil layer present; s-u: 420 bodies, 35 crops. No console errors.
- Collision by real arrow-key input in s-u: walking up into the south rail stops
  the player at y=420 (rail body starts at 424); walking up through the gate
  crosses from y=470 to y=324, i.e. into the plot.
- Screenshots at 1× and 2× camera zoom confirm the gate sits on the lane, posts
  and rails are continuous, and no canopy hangs over a fence.

### Known issues
- Path edges are square tiles: the supplied dirt kit has no outer-corner autotile
  masks for roads, so edges follow the rectangle layout instead of being decorated.
  Farm soil has the same square edge; the fence hides most of it.
- Crops are decorative only — no growth over time, no harvest interaction, and
  the player can walk over the rows inside the plot.
- 400+ tree sprites per map; fine at 60 FPS here, but a larger map would need
  culling or a texture atlas.
- Sprout Lands is still non-commercial (see NFR-014 note).

---


**Status:** on track
**Focus task(s):** PR #12 (asset integration), PR-02 – PR-07 (tooling, tests, CI), DW-038 groundwork
**Commits:** `9e5fb3f`, `07fbc94`, `4b5a9b2`, `3adeee8`, `e7f9f6f`, `b865f14`, `169441f`, `918ee92`, `ae4c2c3`

### Completed
- **PR-02 to PR-05 — quality gates now exist.** Backend gained ESLint, Prettier,
  Vitest and Supertest (`9e5fb3f`); frontend gained ESLint, Prettier, Vitest and
  Testing Library (`07fbc94`); `validateEnv` refuses to boot without `JWT_SECRET`
  (`4b5a9b2`); GitHub Actions runs lint, format check and tests per workspace
  (`3adeee8`).
- **PR-06 — walk animations registered** (`e7f9f6f`): four directional animations
  with idle frames, verified through real keyboard input.
- **PR-07 — Phaser input blocked while the chat drawer is open** (`b865f14`):
  opening the drawer publishes `ui:state` through the bridge and `WorldScene`
  disables its keyboard, releasing held keys. Covered by new App and bridge tests.
- **PR #12 — supplied asset packs merged into `main`** (`169441f`, merged through
  `918ee92` and `ae4c2c3`): 48 files, +2,179/−424. World, houses, props and
  portraits come from Sunnyside World; the player and farm rail come from Sprout
  Lands. `world/terrain.js` and `world/farm.js` add paths, seeded woodland, dirt
  roads and fenced crop plots as map data.
- **Re-audit fixes** recorded in [`../design/asset-inventory.md`](../design/asset-inventory.md#9-re-audit--2026-11-13):
  the two original pack folders are gitignored (P1), the duplicated path frame is
  removed (P2), portrait paths moved out of `App.jsx` into `world/assets.js` (P4),
  and the stale fence line in `CREDITS.md` was corrected (P5). P3, P6, P7 and P8
  remain open by decision.

### Verified
- `npm test --workspace=@dwelling/backend` → 6/6 passing (health + env validation).
- `npm test --workspace=@dwelling/frontend` → 7/7 passing (App 5, bridge 2).
- `npm run lint` in both workspaces exits 0.
- `npm run build` exits 0; the only warning is the pre-existing chunk-size warning
  (1,370 kB minified, 375 kB gzip).
- All 15 runtime asset paths resolve to files on disk (re-audit, read-only check).

### Problems encountered
- **Milestone 7 is delivered in code but not marked `Done`.** The drawer, labelled
  mock history, `Esc` close and input blocking all work, yet DW-035's criterion
  "scenes never touch the DOM directly" still fails: `Dwelling.interact()`
  dispatches a raw `window` `CustomEvent` instead of publishing through
  `bridge/`. That routing is PR-08 and is the remaining blocker for M7.
- **`task-board.md` is internally inconsistent:** the M6 rows and the per-milestone
  counter say 4/4 `Done`, while the overall progress table says `0 / 4` `Not Started`.
- **Root `plan.md` contradicts the docs and the schema.** It describes an 84-PR
  plan with a five-model schema (`User`, `Dwelling`, `Contact`, `Conversation`,
  `Message`), no Altar/`ConversationMember`, Supabase hosting and cookie auth —
  which conflicts with ADR-0015 and `database/prisma/schema.prisma`. Reported,
  not reconciled.
- **Several guides are now stale:** `development/testing.md` and
  `development/coding-conventions.md` still say no test runner or linter exists,
  `development/setup.md` still says "no test command / no CI",
  `development/folder-structure.md` claims a root `.env.example` documenting
  `DATABASE_URL` (the file is `backend/.env.example` and has no `DATABASE_URL`),
  and `architecture/overview.md` still lists non-existent `WorldScene.jsx` /
  `ChatScene.jsx` files and "no CI".

### Decisions made
- None new. The asset re-audit changes are corrections to earlier notes; the
  remaining items (unused `uiExpressionChat`, legacy Kenney files, Vite starter
  leftovers, dwelling collider coupled to the terrain texture) stay open by
  decision, not by oversight.

### Next day's priority
1. **DW-035 / PR-08** — route dwelling interactions through `bridge/`, then run
   the M7 acceptance checklist and update `task-board.md` honestly.
2. **M8 — house interiors** (DW-049 to DW-054), the next unstarted milestone.
3. Reconcile the stale guides above and decide what to do with root `plan.md`.

**Tasks moved to Done:** none — M7 has no verified acceptance run yet

## 2026-11-14 — Phase 2, PR-11: API contract

**Status:** complete (documentation only; not committed)
**Focus task(s):** PR-11

### Completed
- Defined **12 endpoints** in [`../api/README.md`](../api/README.md) — 4 auth
  (signup, login, logout, `GET /api/auth/me`), 3 contacts (list, add, remove),
  3 conversations (list, get-or-create, detail) and 2 messages (paginated read,
  send). All are marked `▢ Defined`, not implemented.
- Recorded **ADR-0022 — JWT authentication using an HttpOnly cookie**: cookie
  `dwelling_session`, `HttpOnly`, `SameSite=Lax`, `Secure` in production,
  seven-day lifetime, no refresh and no revocation.
- Documented honestly that logout only clears the cookie, that a copied JWT stays
  valid until `exp`, and that CSRF rests on JSON-only bodies plus `Origin`
  validation rather than on `SameSite=Lax` alone. A cross-site deployment is
  flagged as needing reassessment.
- Fixed contract/plan drift: `/api/me` → `/api/auth/me`; contacts addressed by
  the peer's `User.id`, not a `Contact` row id; message pagination uses only
  `cursor` (default 50, maximum 100); non-participants get `404`.
- Updated `security-and-caching.md` (cookie, CSRF, `403`/`404` rules),
  `database.md` (peer `User.id` representation) and corrected PR-30's dependency
  in `plan.md` to include PR-12's error envelope.
- No application code, Prisma schema, migration, or dependency changed.

### Problems encountered
- The old API page claimed `API_PREFIX` was imported by both sides; only the
  backend imports it, and the frontend makes no network calls. Corrected.
- Authentication was documented as "cookies vs. tokens undecided" while
  `JWT_SECRET` was already required at boot and the roadmap assumed a cookie.
  Resolved by ADR-0022 rather than leaving the contradiction.
- PR-30 builds error handling for the frontend but depended only on PR-11 and
  PR-23; it now also depends on PR-12.

### Decisions made
- **ADR-0022** — JWT authentication using an HttpOnly cookie, seven-day TTL, no
  refresh or revocation in v1.
- Conversation creation: existing non-contact → `403 NOT_CONTACTS`; unknown user
  → `404 USER_NOT_FOUND`, with the user-existence disclosure documented.
- Contact removal's effect on an existing conversation remains **OQ-4**, and
  last-message preview/list ordering remain **OQ-6/OQ-7** for PR-53.

### Next day's priority
1. PR-12 — shared validation and error envelope conventions.
2. PR-15/PR-16 — five-model schema and the first migration.

**Tasks moved to Done:** PR-11

---

## Upcoming entries

Entries are added as the ten-day plan is executed:

| Day | Planned date | Milestone | Entry written? |
| --- | --- | --- | --- |
| Day 1 | 2026-10-17 | Foundation and project structure | Yes |
| Day 2 | 2026-10-17 | World rendering and the asset pipeline | Yes |
| Day 3 | 2026-10-17 | Player movement | Yes |
| Day 4 | 2026-10-17 | Collision and camera | Yes |
| Day 5 | 2026-10-18 | Dwellings and interactions | Yes |
| Day 6 | 2026-10-19 | Maps, second map and HUD | Yes |
| Day 7 | 2026-11-13 | DOM bridge and conversation sidebar | Yes |
| Day 8 | _(fill in)_ | House interiors | No |
| Day 9 | _(fill in)_ | Altar and polish | No |
| Day 10 | _(fill in)_ | Integration and review | No |

> Fill in the planned date for each day as you schedule it. The original
> scaffold was committed on **2026-09-20** and the folder structure on
> **2026-09-28**; the ten-day plan starts from the current working day.
