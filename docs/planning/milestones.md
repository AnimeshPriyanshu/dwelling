# Ten-Day Milestones

The current plan: **ten small milestones, one per working day**, focused on
**frontend development** — a usable 2D world with movement, collision, dwellings,
a shared interior, an Altar, and a conversation sidebar.

> **The plan was extended from seven days to ten during the requirements session**
> on 2026-10-17. Interiors were added to the phase and the map selector was kept,
> so the schedule grew rather than cutting scope. See ADR-0014 in
> [`decisions.md`](decisions.md) and the session entry in
> [`daily-log.md`](daily-log.md).

## Confirmed direction

Settled with the project owner during the requirements session. These are
**decisions**, not open questions.

| Area | Confirmed |
| --- | --- |
| Visual style | 16-bit **pixel art**, top-down with a **slight 3/4 tilt** |
| Mood | **Cozy and warm** — wood, lantern light, autumn tones |
| Movement | **WASD and arrow keys**, delta-time, normalized diagonals |
| Camera | **Follows the player, clamped** to the map edges |
| Maps | **Separate maps** reached by a selector or portal |
| Dwelling interaction | Approach → prompt → **press a key** to open the chat sidebar |
| Interiors | **In scope** — one **shared** interior template per dwelling (fireplace, kitchen, bed) |
| Altar | **Scenery only** this phase |
| Chat UI | **Docked sidebar** replacing the Conversations panel, **mock content labelled as mock** |
| Conversation model | 1:1 conversations are **private**; more than two people share a conversation only in an **Altar group space** |
| Extra UI | **Minimal HUD only** (map name + interact prompt) |
| Devices | **Desktop-first**, layout stays usable on small screens |
| Assets | **Hybrid** — CC0 packs for tiles/houses/furniture, code-authored art for Dwelling-specific pieces |
| Effort | **4–6 focused hours per day**, working alone |
| Deferred to the next phase | Farms (work + chat), achievements, audio, touch controls, real messaging |

## Ground rules

- **A day is not complete because files were created.** Every milestone has
  observable acceptance criteria; the day is done only when they are met.
- **Task IDs are shared with [`task-board.md`](task-board.md).** Update both.
- **IDs are stable labels, not sequence numbers.** Tasks `DW-001`–`DW-043` keep
  their original IDs even though some have moved to different days, because docs
  and ADRs reference them. New work continues from `DW-044`.
- Effort is estimated for **part-time days of roughly 4–6 focused hours**.
- Tasks are sized for **30–120 minutes** each.
- Day 9 doubles as the schedule buffer. If the week runs long, that is where the
  overrun lands.

## Starting state (verified by inspection)

| Area | Reality today |
| --- | --- |
| Repo | npm-workspace monorepo: `frontend`, `backend`, `database`, `shared` |
| Frontend shell | `frontend/src/main.js` renders a static World/Conversations layout |
| Phaser | Declared (`^3.90.0`, installed `3.90.0`) but **not imported anywhere** — no `new Phaser.Game` call exists |
| Game code | `frontend/src/world/` contains only a `README.md` — **no scenes, no entities** |
| Chat code | `frontend/src/chat/` contains only a `README.md` — **no components** |
| Assets | **No game assets at all.** Only `public/favicon.svg`, `public/icons.svg`, and three unused Vite starter leftovers in `src/assets/`. **No** sprites, tilesets, houses, furniture, Altar art, fonts, or audio. `frontend/public/assets/` does not exist |
| Tooling | **No image generator, no Pillow, no ImageMagick, no image libs in `node_modules`.** ffmpeg exists. Python `zlib` + `struct` can write PNGs with no dependencies |
| Tests | **None configured.** No test script in any `package.json` |
| Build | `npm run build` passes with `vite@8.3.1` (verified 2026-10-17), producing a 1.15 kB JS bundle from the static shell |

**Consequence:** Day 1 wires Phaser into an empty `world/` directory, and Day 2
introduces the first real art. Nothing is being rebuilt, and no asset is assumed
to exist.

> **Note on assets.** The repository contains no game asset of any kind, and this
> environment has **no image generator** (no Pillow, no ImageMagick, no image
> libraries in `node_modules`). DW-044 therefore sources CC0 packs, and
> code-authored art covers Dwelling-specific pieces. See
> [`../design/assets.md`](../design/assets.md) and ADR-0011.

---

## Milestone 1 — Foundation and project structure

**Day 1 · Covers:** NFR-001, NFR-002, NFR-003, NFR-004, FR-001

### Objective
Wire Phaser 3 into the existing Vite frontend and establish the folder and
configuration skeleton, without breaking the current HTML shell.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-001 | Inspect the repository and record the current structure and tooling | High | 30m | — |
| DW-002 | Verify Phaser 3 actually loads and renders under Vite (smoke test) | High | 30m | — |
| DW-003 | Create `frontend/src/world/game.js` with the Phaser game config (`parent: 'world'`) | High | 1h | DW-002 |
| DW-004 | Create `world/scenes/` with `BootScene` and `PreloadScene` stubs | High | 1h | DW-003 |
| DW-005 | Create a `WorldScene` stub and register scene order in the config | High | 1h | DW-003 |
| DW-006 | Start the game from `frontend/src/main.js` without removing the sidebar | High | 1h | DW-004, DW-005 |
| DW-007 | Verify `npm run dev` and `npm run build` both pass with Phaser mounted | High | 30m | DW-006 |

### Acceptance criteria
- [ ] A Phaser canvas appears inside the existing `#world` element.
- [ ] The sidebar panel is still present and the page layout is intact.
- [ ] `npm run dev` serves the app with no console errors from Phaser.
- [ ] `npm run build` exits successfully.
- [ ] Phaser is imported as an ES module (no CDN script tag).

### Testing checklist
- [ ] `npm install` completes.
- [ ] `npm run dev` → open `http://localhost:5173` → canvas visible in World panel.
- [ ] Resize the window; the canvas does not overflow its panel.
- [ ] `npm run build` → `frontend/dist/` is regenerated without errors.

### Definition of Done
Phaser is mounted and running from the Vite entry point, the pre-existing HTML
layout still works, and both dev and build commands succeed.

### Risks / blockers
- **Asset-less canvas confusion** — an empty canvas may look broken. Mitigate by
  rendering a colored background rectangle in `WorldScene` so there is visible
  proof Phaser is running.
- **Phaser-under-Vite is unverified.** `vite@8.3.1` and `phaser@3.90.0` install and
  the build passes, but Phaser has never rendered here. DW-002 is the proof.

---

## Milestone 2 — World rendering and the asset pipeline

**Day 2 · Covers:** FR-001, FR-007 (bounds), FR-018 (data shape), NFR-006, NFR-009, NFR-014

### Objective
Render a real, tiled world at defined dimensions, and establish the asset
pipeline that every later day depends on.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-044 | Source CC0 packs: ground tileset, house exteriors, props, interior furniture | High | 1h | DW-001 |
| DW-045 | Verify each asset's license and write `frontend/public/assets/CREDITS.md` | High | 30m | DW-044 |
| DW-046 | Define the tileset/atlas loading strategy in `world/assets.js` (keys → files) | High | 1h | DW-044 |
| DW-008 | Define world constants (tile size, world size) in `world/constants.js` | High | 30m | DW-003 |
| DW-009 | Render a ground layer from the tileset at the world's dimensions | High | 1h | DW-008, DW-046 |
| DW-010 | Set physics/world bounds and camera bounds from the constants | High | 30m | DW-008 |
| DW-011 | Create `frontend/public/assets/` with the documented subfolders and `README.md` | Medium | 30m | — |
| DW-012 | Load assets in `PreloadScene` with a progress indicator | Medium | 1h | DW-004, DW-011 |
| DW-013 | Verify the world renders and the build still passes | High | 30m | DW-009, DW-010 |

### Acceptance criteria
- [ ] A tiled ground layer fills the visible world with no seams.
- [ ] Tile size and world dimensions are defined **once**, in constants.
- [ ] Off-camera area beyond the world bounds is not reachable or shown.
- [ ] `frontend/public/assets/` exists with the documented subfolders.
- [ ] **Every third-party file's pack, author, license and URL is recorded in
      `CREDITS.md`**, and each license permits this use (NFR-014).
- [ ] The game still runs if an optional asset is missing (no crash, no blank world).

### Testing checklist
- [ ] Ground tiles align with no visible seams at default zoom.
- [ ] Panning to each edge shows a hard boundary, not infinite empty space.
- [ ] Devtools Network tab: asset requests return 200, and none exceeds 512 KB.
- [ ] Temporarily rename one optional asset; the world still loads.
- [ ] `npm run build` passes after new files are added.

### Definition of Done
The world is a bounded, tiled area built from constants, real art loads through a
single asset-key module, and the licensing record is complete.

### Risks / blockers
- **Licensing.** No asset enters the repository without a recorded license.
  Anything unverifiable gets replaced, not shipped.
- **Style consistency across packs** — mixing packs can look incoherent. Prefer
  one pack family for tiles and houses; check visually before committing to it.
- **Time sink.** Sourcing is capped at DW-044's hour. If nothing suitable is
  found, fall back to code-authored placeholder tiles and carry the search to
  Day 3 rather than burning the day.

---

## Milestone 3 — Player movement

**Day 3 · Covers:** FR-002, FR-003, FR-004, FR-005, FR-009

### Objective
Add the player character with keyboard movement and a real walk animation.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-047 | Assemble the player sprite sheet (4 directions) and register walk animations | High | 1.5h | DW-044 |
| DW-014 | Create `world/entities/Player.js` using the player sprite | High | 1h | DW-008, DW-047 |
| DW-015 | Add keyboard input for arrow keys and WASD | High | 1h | DW-014 |
| DW-016 | Apply delta-time velocity and normalize diagonal movement | High | 1h | DW-015 |
| DW-019 | Play the correct walk animation per facing direction | Medium | 1h | DW-047 |
| DW-017 | Add a run/walk speed toggle (Shift) | Low | 30m | DW-016 |
| DW-018 | Reflect facing direction (animation or a visible indicator) | Medium | 30m | DW-014 |

> **DW-019 is no longer blocked** — it was waiting on a sprite sheet that did not
> exist. DW-047 now produces one. Until DW-047 is done, DW-019 stays `Blocked`.

### Acceptance criteria
- [ ] The player is visible at the spawn position.
- [ ] All eight movement directions respond to both arrow keys and WASD.
- [ ] Movement speed is identical at 60 FPS and at a throttled frame rate.
- [ ] Diagonal movement is not faster than axis-aligned movement.
- [ ] Facing direction is visible while moving.
- [ ] A walk animation plays in the facing direction and stops when idle.

### Testing checklist
- [ ] Hold each direction key individually; the player moves correctly.
- [ ] Hold two keys (e.g. Up + Right); diagonal speed matches single-axis speed.
- [ ] Throttle the CPU in devtools; movement stays smooth and consistent.
- [ ] Release all keys; the player stops cleanly with no drift and no frozen frame.
- [ ] Walk in all four directions; the animation matches the direction and resets.

### Definition of Done
The player moves responsively at a frame-rate-independent speed in all
directions, with a correct walk animation per direction.

### Risks / blockers
- **Sprite sheet mismatch** — a pack's grid may not match Phaser's frame
  expectations (padding, row order). Budget time in DW-047 for slicing, and
  verify visually before wiring movement to it.
- **Animation versus physics** — animations must not drive position. Movement
  stays velocity-based; animation only reflects it.

---

## Milestone 4 — Collision and camera

**Day 4 · Covers:** FR-006, FR-007, FR-008

### Objective
Make the world solid: obstacles block the player, edges contain them, and the
camera follows.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-020 | Add a static obstacle group using real prop sprites | High | 1h | DW-009, DW-044 |
| DW-021 | Register a collider between the player and the obstacle group | High | 30m | DW-020, DW-014 |
| DW-022 | Make the camera follow the player | High | 30m | DW-014 |
| DW-023 | Clamp the camera to the world bounds | High | 30m | DW-010, DW-022 |
| DW-024 | Test movement against world edges and every obstacle | High | 30m | DW-021, DW-023 |
| DW-025 | Fix movement/collision bugs found while testing | High | 1h | DW-024 |

### Acceptance criteria
- [ ] The player cannot pass through any obstacle from any direction, including
      diagonals and at corners.
- [ ] The player cannot leave the world bounds.
- [ ] The camera follows the player smoothly and never shows area outside the world.
- [ ] No "sticking" or jitter when sliding along an obstacle.

### Testing checklist
- [ ] Walk into each obstacle from all four sides.
- [ ] Slide along a wall diagonally — movement continues along the wall.
- [ ] Walk into each world corner.
- [ ] Move to a map edge and confirm the camera stops with the player.
- [ ] Look for screen-shake or stutter while moving continuously for 30s.

### Definition of Done
The world is fully solid and contained, and the camera behaves correctly at all
boundaries.

### Risks / blockers
- **Collision bodies versus sprite shape.** With 3/4-tilt art, a sprite's visual
  footprint differs from its body. Set an explicit body size/offset rather than
  accepting the sprite bounds.
- **Camera jitter** — lerping the camera can fight the bounds clamp; test at
  edges specifically.

---

## Milestone 5 — Dwellings and interactions

**Day 5 · Covers:** FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016

### Objective
Place houses in the world, let the player approach them, and give clear
interaction feedback.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-026 | Create `world/entities/Dwelling.js` (house sprite + contact id + position) | High | 1h | DW-020 |
| DW-027 | Place several dwellings in the world from a data list | High | 1h | DW-026 |
| DW-028 | Add an interaction zone to each dwelling | High | 1h | DW-026 |
| DW-029 | Show a visible prompt when the player is inside a zone | High | 1h | DW-028 |
| DW-030 | Emit an interaction event carrying the contact id on interact key (`E`) | High | 1h | DW-028 |
| DW-031 | Wire the event to a placeholder DOM handler (log or panel toggle) | Medium | 30m | DW-030 |

### Acceptance criteria
- [ ] Multiple dwellings render at distinct positions in the world.
- [ ] Each dwelling is bound to a unique contact id.
- [ ] Entering a zone shows a clear prompt naming the dwelling/contact.
- [ ] Leaving a zone clears the prompt.
- [ ] Only the nearest/active dwelling is interactable when zones overlap.
- [ ] Pressing `E` inside a zone fires an event with the **correct** contact id.

### Testing checklist
- [ ] Walk to each dwelling; the prompt shows the right name.
- [ ] Walk away; the prompt disappears immediately.
- [ ] Stand between two dwellings; exactly one prompt is active, matching the
      closer one.
- [ ] Interact with each dwelling and confirm the logged/opened contact id.
- [ ] Press `E` outside any zone; nothing happens. Press `E` while moving; the
      player does not stall.

### Definition of Done
Dwellings are data-placed, approachable, and produce unambiguous, correct
interaction feedback and events.

### Risks / blockers
- **Overlapping zones** — resolve to a single nearest active dwelling.
- **Zone versus door.** A dwelling needs **two** interaction points: the door
  (enter the interior) and the dwelling itself (open chat). Decide the rule now —
  proposed: the door zone is smaller and takes priority when both overlap — and
  record it if it needs an ADR.

---

## Milestone 6 — Map structure, second map and HUD

**Day 6 · Covers:** FR-017, FR-018, FR-019, FR-020, FR-021 (HUD)

### Objective
Turn the single world into data-driven, switchable maps.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-032 | Define the map data format and migrate inline dwelling/obstacle data into it | High | 1.5h | DW-027, DW-020 |
| DW-033 | Add a map registry and load a map by id | High | 1h | DW-032 |
| DW-034 | Add a minimal map selector (or portal) and author the **second map** | High | 1.5h | DW-033 |
| DW-037 | Add a HUD showing the current map name | Low | 30m | DW-033 |

### Acceptance criteria
- [ ] A map is fully described by data: id, alphabet range, size, spawn,
      dwellings, doors, obstacles, and the Altar position.
- [ ] The world scene contains **no hard-coded dwelling or obstacle positions**.
- [ ] **Two maps** exist and can be switched between without a page reload.
- [ ] Switching maps repopulates the world and moves the player to that map's spawn.
- [ ] The HUD shows the current map's name/range and updates on change.

### Testing checklist
- [ ] Load the default map; verify spawn, dwellings, obstacles and Altar come from data.
- [ ] Add a third map entry in data only; confirm it loads without editing scene code.
- [ ] Switch maps repeatedly; no leaked sprites, no duplicate colliders, no errors.
- [ ] Switch maps while a prompt is visible; the prompt clears.
- [ ] HUD text matches the loaded map in both maps.

### Definition of Done
Maps are data-driven, two of them load and switch cleanly, and the HUD reports
the active map.

### Risks / blockers
- **Scene reuse versus recreation.** Proposed: reuse one `WorldScene` and
  repopulate it. Recreating scenes mid-flight risks duplicate listeners — verify
  with repeated switches.
- **Second map time sink.** Author it as a variation of the first (fewer
  dwellings is fine). Its job is to prove switching, not to be beautiful.

---

## Milestone 7 — DOM bridge and the conversation sidebar

**Day 7 · Covers:** FR-022, FR-023, FR-024, FR-025, FR-032, FR-033

### Objective
Connect the canvas to the HTML UI and open a real conversation sidebar, with
mock content clearly labelled as mock.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-035 | Add a Phaser ↔ DOM event bridge module | High | 1h | DW-031 |
| DW-036 | Add a conversation sidebar panel driven by interactions (replaces the Conversations panel) | High | 1.5h | DW-035, DW-030 |
| DW-048 | Add mock contacts and message history, clearly labelled "Mock data — messaging not implemented yet" | Medium | 1h | DW-036 |
| DW-038 | Decide and implement the input-focus rule (panel open = DOM owns the keyboard; `Esc` closes) | High | 1h | DW-036 |

### Acceptance criteria
- [ ] Interacting with a dwelling opens the sidebar showing the **correct** contact name.
- [ ] The panel is docked beside the world; the canvas stays visible and is not covered.
- [ ] The panel can be closed with `Esc` and a close button, returning control to the world.
- [ ] Mock content is **visibly labelled** as mock; no input field pretends to work.
- [ ] While the panel is open, movement keys do not move the player.
- [ ] Scenes never touch the DOM directly; all updates arrive through the bridge.

### Testing checklist
- [ ] Open a conversation for each dwelling; the name matches every time.
- [ ] Close the panel; movement and interaction work again.
- [ ] Type while the panel is open; nothing moves the player.
- [ ] Reload mid-session; the app returns to a clean state.
- [ ] Console is free of bridge/listener warnings after 10 open/close cycles.

### Definition of Done
The canvas and the HTML sidebar communicate only through a dedicated bridge, the
right conversation opens and closes cleanly, and nothing misrepresents itself as
working messaging.

### Risks / blockers
- **Input-focus conflicts** — the highest-risk bug in the phase. Two systems
  listening for the same keys must never both act.
- **Mock data read as real.** A demo viewer may believe sending works. The label
  is a requirement (FR-033), not decoration.

---

## Milestone 8 — House interiors

**Day 8 · Covers:** FR-030, FR-031

### Objective
Let the player walk into a dwelling and stand in a real interior room.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-049 | Add a door to each dwelling with its own trigger and prompt | High | 1h | DW-026, DW-030 |
| DW-050 | Define the interior room data format (reuse the map format where possible) | High | 1h | DW-032 |
| DW-051 | Build the shared interior room: floor, walls, fireplace, kitchen counter, bed | High | 2h | DW-050, DW-044 |
| DW-052 | Switch exterior ↔ interior without a page reload, spawning at the door | High | 1.5h | DW-049, DW-051 |
| DW-053 | Collide correctly inside: walls and furniture block, exits stay clear | High | 1h | DW-051 |
| DW-054 | Exiting the interior returns the player to that dwelling's door | High | 1h | DW-052 |

> **On ID ordering:** new work continues in day order (`DW-044` onwards), while
> existing `DW-001`–`DW-043` keep their original numbers. A milestone's list
> therefore does not always read strictly ascending.

### Acceptance criteria
- [ ] Each dwelling has a door the player can reach and enter.
- [ ] Entering shows the shared interior: fireplace, kitchen area, and bed, all recognisable.
- [ ] Exiting returns the player to the door of **the dwelling they entered** (not a default spawn).
- [ ] Walls and furniture block movement; the doorway does not.
- [ ] Entering and exiting repeatedly leaves no duplicate sprites or colliders.
- [ ] No page reload occurs at any point.

### Testing checklist
- [ ] Enter and exit from two different dwellings; the return position is correct both times.
- [ ] Walk into every interior wall and each furniture item.
- [ ] Try to leave through a wall; it is blocked. Leave through the door; it works.
- [ ] Enter, exit, re-enter 10 times; check the console and sprite count.
- [ ] Enter the interior, then switch maps; the state is not corrupted.

### Definition of Done
Exteriors and interiors form a coherent two-location world with correct return
positions and solid collision in both.

### Risks / blockers
- **Return-position bugs** — track which dwelling was entered, not just "the map".
  This is the most likely bug of the day; test with two dwellings specifically.
- **Reuse versus recreation** again applies. Prefer one scene that loads either a
  map or a room.
- **Interior scope creep** — the template is shared and simple. Personalised rooms
  are a later milestone, not a Day 8 addition.

---

## Milestone 9 — The Altar and the polish pass

**Day 9 · Covers:** FR-026 (scenery), NFR-005

### Objective
Make the Altar a visible, distinct landmark, and polish what already exists.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-055 | Author the Altar art (code-authored, distinct silhouette) | Medium | 1h | DW-011 |
| DW-056 | Place the Altar in the map data and render it as scenery | Medium | 1h | DW-033, DW-055 |
| DW-057 | Polish pass: animation timing, facing, run toggle, prompt styling | Medium | 2h | DW-047, DW-029 |
| DW-058 | Visual consistency pass over the map, interiors and HUD against the cozy palette | Medium | 1h | DW-056 |

### Acceptance criteria
- [ ] The Altar is visible in the world and clearly distinct from dwellings.
- [ ] Its position comes from map data, not scene code.
- [ ] It does **not** pretend to be interactive — no misleading prompt.
- [ ] Animation, facing, prompt and palette are visually consistent across
      exteriors, interiors and HUD.

### Testing checklist
- [ ] The Altar appears in both maps (or the one where it is placed) and at the right position.
- [ ] Walking up to the Altar shows no prompt promising a group chat.
- [ ] Walk animation does not stutter when changing direction rapidly.
- [ ] Prompts are legible against both grass and interior flooring.

### Definition of Done
The Altar reads as a real place in the world without implying function it does
not have, and the visuals are consistent enough to demo.

### Risks / blockers
- **This is the schedule buffer.** If Days 1–8 overran, DW-055–DW-058 shrink; the
  Altar may then be bound to Day 10's fix budget rather than dropped.
- **Silent scope creep.** Any temptation to make the Altar interactive belongs to
  the next phase; note it in the roadmap instead.

---

## Milestone 10 — Integration and review

**Day 10 · Covers:** NFR-004, NFR-013, NFR-015, plus closing out all prior days

### Objective
Prove the whole phase works together, fix what is broken, and leave honest
material for the graded report.

### Tasks

| ID | Task | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| DW-039 | Run a full manual smoke test of Days 1–9 features | High | 1h | DW-020 … DW-058 |
| DW-040 | Fix high-priority bugs found in the smoke test | High | 2h | DW-039 |
| DW-041 | Verify clean install, `npm run dev`, and `npm run build` | High | 30m | DW-040 |
| DW-042 | Capture screenshots and write the demo script for the graded report | Medium | 1h | DW-039 |
| DW-043 | Update docs (milestones, task-board, daily-log, decisions) and record incomplete work | Medium | 1h | DW-039 |
| DW-059 | Define the next milestone (farms, achievements, real messaging) | Medium | 30m | DW-039 |

### Acceptance criteria
- [ ] Every Day 1–9 acceptance criterion holds when tested **together**.
- [ ] No console errors during a normal play session.
- [ ] A fresh `npm install` → `npm run dev` → `npm run build` sequence succeeds.
- [ ] Screenshots are committed under `docs/assets/` and a demo script exists.
- [ ] Documentation reflects the final state, including anything left unfinished.
- [ ] Remaining tasks are explicitly listed, not silently dropped.

### Testing checklist
- [ ] Follow every checklist in [`development/testing.md`](../development/testing.md).
- [ ] Full loop: start → walk → enter a house → return → open chat → switch map.
- [ ] Reload the page mid-session; the app recovers cleanly.
- [ ] Test at 320px viewport width.
- [ ] Test in a second browser.

### Definition of Done
The phase's features work together, the build is reproducibly green, and the
documentation and report material honestly reflect reality.

### Risks / blockers
- **Time overrun** — prioritise DW-040 (fixes) over DW-042 (report material), but
  do not skip DW-043; an undocumented gap becomes a lost task.
- **Late structural surprises** — record them in `decisions.md` and defer the fix
  to the next milestone rather than half-fixing it.

---

## Effort summary

| Milestone | Tasks | Estimated effort |
| --- | --- | --- |
| M1 — Foundation | 7 | ~5h |
| M2 — World rendering and assets | 9 | ~6.5h |
| M3 — Player movement | 7 | ~6h |
| M4 — Collision and camera | 6 | ~4h |
| M5 — Dwellings and interactions | 6 | ~5.5h |
| M6 — Maps, second map, HUD | 4 | ~4.5h |
| M7 — Bridge and chat sidebar | 4 | ~4.5h |
| M8 — House interiors | 6 | ~7.5h |
| M9 — Altar and polish | 4 | ~5h |
| M10 — Integration and review | 6 | ~6h |
| **Total** | **59** | **~54h** |

At **4–6 focused hours per day over ten days** (40–60h) this is tight but
realistic, with Day 9 as the buffer.

## Requirement coverage

| Requirement | Milestone |
| --- | --- |
| FR-001 | M1, M2 |
| FR-002 – FR-005, FR-009 | M3 |
| FR-006 – FR-008 | M2 (bounds), M4 |
| FR-010 – FR-016 | M5 |
| FR-017 – FR-021 | M6 |
| FR-022 – FR-025, FR-032, FR-033 | M7 |
| FR-026 | M9 (scenery only) |
| FR-030 – FR-031 | M8 |
| NFR-001 – NFR-004, NFR-006 | M1, M2, M10 |
| NFR-005, NFR-009, NFR-014 | M2, M9 |
| NFR-013, NFR-015 | M10 |
| FR-027 – FR-029 | **Not in this phase** — deferred (see `scope.md`) |
