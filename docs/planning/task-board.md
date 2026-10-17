# Task Board

The checkable list of work. **This is the file you update at the end of every
working session.**

- Tasks `DW-001`–`DW-043` keep their original IDs; new work continues from
  `DW-044`. IDs are stable labels, not sequence numbers.
- IDs are defined next to their milestone in [`milestones.md`](milestones.md) —
  keep the two files synchronized.
- **Milestones 1–2 are `Done`; every other task is still `Not Started`.** Statuses
  change only when acceptance criteria have been verified by running the app (or
  when the owner explicitly confirms it).
- Current milestone: **Milestone 5 — Dwellings and interactions**.
- The plan is **ten days**, extended from seven during the requirements session
  (ADR-0014 in [`decisions.md`](decisions.md)).

## Status legend

| Status | Meaning |
| --- | --- |
| `Not Started` | No work begun. |
| `In Progress` | Actively being worked on. **Keep this to ~1–2 tasks at a time.** |
| `Blocked` | Cannot proceed — the `Dependencies` or the note explains why. |
| `Done` | Acceptance criteria verified. |

Priority: **High** = milestone cannot complete without it · **Medium** = expected
this phase · **Low** = nice to have, drop first under time pressure.

---

## Milestone 1 — Foundation and project structure (Day 1)

> **Implemented with React** (ADR-0016): the game is started from the React shell
> (`frontend/src/App.jsx`, rendered by `main.js`) via `createGame()` in
> `world/game.js`, and mounts a canvas into the `#world` element.

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-001 | Inspect the repository and record current structure and tooling | High | Done | 30m | — |
| DW-002 | Verify Phaser 3 loads and renders under Vite (smoke test) | High | Done | 30m | — |
| DW-003 | Create `world/game.js` with the Phaser game config (`parent: 'world'`) | High | Done | 1h | DW-002 |
| DW-004 | Create `world/scenes/` with `BootScene` and `PreloadScene` stubs | High | Done | 1h | DW-003 |
| DW-005 | Create a `WorldScene` stub and register scene order | High | Done | 1h | DW-003 |
| DW-006 | Start the game from `main.js` without removing the sidebar | High | Done | 1h | DW-004, DW-005 |
| DW-007 | Verify `npm run dev` and `npm run build` both pass with Phaser mounted | High | Done | 30m | DW-006 |

**Milestone 1 progress:** 7 / 7 done

## Milestone 2 — World rendering and the asset pipeline (Day 2)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-044 | Source CC0 packs: ground tileset, house exteriors, props, interior furniture | High | Done | 1h | DW-001 |
| DW-045 | Verify each asset's license and write `frontend/public/assets/CREDITS.md` | High | Done | 30m | DW-044 |
| DW-046 | Define the tileset/atlas loading strategy in `world/assets.js` | High | Done | 1h | DW-044 |
| DW-008 | Define world constants (tile size, world size) in `world/constants.js` | High | Done | 30m | DW-003 |
| DW-009 | Render a ground layer from the tileset at the world's dimensions | High | Done | 1h | DW-008, DW-046 |
| DW-010 | Set physics/world bounds and camera bounds from the constants | High | Done | 30m | DW-008 |
| DW-011 | Create `frontend/public/assets/` with documented subfolders and `README.md` | Medium | Done | 30m | — |
| DW-012 | Load assets in `PreloadScene` with a progress indicator | Medium | Done | 1h | DW-004, DW-011 |
| DW-013 | Verify the world renders and the build still passes | High | Done | 30m | DW-009, DW-010 |

**Milestone 2 progress:** 9 / 9 done

## Milestone 3 — Player movement (Day 3)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-047 | Assemble the player sprite sheet (4 directions) and register walk animations | High | Done | 1.5h | DW-044 |
| DW-014 | Create `world/entities/Player.js` using the player sprite | High | Done | 1h | DW-008, DW-047 |
| DW-015 | Add keyboard input for arrow keys and WASD | High | Done | 1h | DW-014 |
| DW-016 | Apply delta-time velocity and normalize diagonal movement | High | Done | 1h | DW-015 |
| DW-019 | Play the correct walk animation per facing direction | Medium | Done | 1h | DW-047 |
| DW-017 | Add a run/walk speed toggle (Shift) | Low | Done | 30m | DW-016 |
| DW-018 | Reflect facing direction (animation or visible indicator) | Medium | Done | 30m | DW-014 |

**Milestone 3 progress:** 7 / 7 done

## Milestone 4 — Collision and camera (Day 4)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-020 | Add a static obstacle group using real prop sprites | High | Done | 1h | DW-009, DW-044 |
| DW-021 | Register a collider between the player and the obstacle group | High | Done | 30m | DW-020, DW-014 |
| DW-022 | Make the camera follow the player | High | Done | 30m | DW-014 |
| DW-023 | Clamp the camera to the world bounds | High | Done | 30m | DW-010, DW-022 |
| DW-024 | Test movement against world edges and every obstacle | High | Done | 30m | DW-021, DW-023 |
| DW-025 | Fix movement/collision bugs found while testing | High | Done | 1h | DW-024 |

**Milestone 4 progress:** 6 / 6 done

## Milestone 5 — Dwellings and interactions (Day 5)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-026 | Create `world/entities/Dwelling.js` (house sprite + contact id + position) | High | Not Started | 1h | DW-020 |
| DW-027 | Place several dwellings in the world from a data list | High | Not Started | 1h | DW-026 |
| DW-028 | Add an interaction zone to each dwelling | High | Not Started | 1h | DW-026 |
| DW-029 | Show a visible prompt when the player is inside a zone | High | Not Started | 1h | DW-028 |
| DW-030 | Emit an interaction event carrying the contact id on the interact key (`E`) | High | Not Started | 1h | DW-028 |
| DW-031 | Wire the event to a placeholder DOM handler (log or panel toggle) | Medium | Not Started | 30m | DW-030 |

**Milestone 5 progress:** 0 / 6 done

## Milestone 6 — Map structure, second map and HUD (Day 6)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-032 | Define the map data format and migrate inline data into it | High | Not Started | 1.5h | DW-027, DW-020 |
| DW-033 | Add a map registry and load a map by id | High | Not Started | 1h | DW-032 |
| DW-034 | Add a minimal map selector (or portal) and author the second map | High | Not Started | 1.5h | DW-033 |
| DW-037 | Add a HUD showing the current map name | Low | Not Started | 30m | DW-033 |

**Milestone 6 progress:** 0 / 4 done

## Milestone 7 — DOM bridge and conversation sidebar (Day 7)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-035 | Add a Phaser ↔ DOM event bridge module | High | Not Started | 1h | DW-031 |
| DW-036 | Add a conversation sidebar panel (replaces the Conversations panel) | High | Not Started | 1.5h | DW-035, DW-030 |
| DW-048 | Add mock contacts and message history, visibly labelled as mock data | Medium | Not Started | 1h | DW-036 |
| DW-038 | Decide and implement the input-focus rule (panel open = DOM owns the keyboard) | High | Not Started | 1h | DW-036 |

**Milestone 7 progress:** 0 / 4 done

## Milestone 8 — House interiors (Day 8)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-049 | Add a door to each dwelling with its own trigger and prompt | High | Not Started | 1h | DW-026, DW-030 |
| DW-050 | Define the interior room data format (reuse the map format where possible) | High | Not Started | 1h | DW-032 |
| DW-051 | Build the shared interior room: floor, walls, fireplace, kitchen counter, bed | High | Not Started | 2h | DW-050, DW-044 |
| DW-052 | Switch exterior ↔ interior without a page reload, spawning at the door | High | Not Started | 1.5h | DW-049, DW-051 |
| DW-053 | Collide correctly inside: walls and furniture block, exits stay clear | High | Not Started | 1h | DW-051 |
| DW-054 | Exiting the interior returns the player to that dwelling's door | High | Not Started | 1h | DW-052 |

**Milestone 8 progress:** 0 / 6 done

## Milestone 9 — Altar and polish (Day 9)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-055 | Author the Altar art (code-authored, distinct silhouette) | Medium | Not Started | 1h | DW-011 |
| DW-056 | Place the Altar in the map data and render it as scenery | Medium | Not Started | 1h | DW-033, DW-055 |
| DW-057 | Polish pass: animation timing, facing, run toggle, prompt styling | Medium | Not Started | 2h | DW-047, DW-029 |
| DW-058 | Visual consistency pass over map, interiors and HUD | Medium | Not Started | 1h | DW-056 |

**Milestone 9 progress:** 0 / 4 done

## Milestone 10 — Integration and review (Day 10)

| ID | Task | Priority | Status | Estimate | Dependencies |
| --- | --- | --- | --- | --- | --- |
| DW-039 | Run a full manual smoke test of Days 1–9 features | High | Not Started | 1h | DW-020 … DW-058 |
| DW-040 | Fix high-priority bugs found in the smoke test | High | Not Started | 2h | DW-039 |
| DW-041 | Verify clean install, `npm run dev`, and `npm run build` | High | Not Started | 30m | DW-040 |
| DW-042 | Capture screenshots and write the demo script for the graded report | Medium | Not Started | 1h | DW-039 |
| DW-043 | Update docs and record incomplete work | Medium | Not Started | 1h | DW-039 |
| DW-059 | Define the next milestone (farms, achievements, real messaging) | Medium | Not Started | 30m | DW-039 |

**Milestone 10 progress:** 0 / 6 done

---

## Overall progress

| Milestone | Tasks done | Status |
| --- | --- | --- |
| 1 — Foundation | 7 / 7 | **Done** |
| 2 — World rendering and assets | 9 / 9 | **Done** |
| 3 — Player movement | 7 / 7 | **Done** |
| 4 — Collision and camera | 6 / 6 | **Done** |
| 5 — Dwellings and interactions | 0 / 6 | Not Started |
| 6 — Maps, second map and HUD | 0 / 4 | Not Started |
| 7 — Bridge and conversation sidebar | 0 / 4 | Not Started |
| 8 — House interiors | 0 / 6 | Not Started |
| 9 — Altar and polish | 0 / 4 | Not Started |
| 10 — Integration and review | 0 / 6 | Not Started |
| **Total** | **29 / 59** | |

## Backlog (not scheduled)

Requested or discovered work that does **not** belong to the current ten days.
Move an item into a milestone only when it is the right time; otherwise leave it here.

| ID | Idea | Notes |
| --- | --- | --- |
| DW-B01 | Farms: travel to a farm, work there, and chat | Requested 2026-10-17. Needs the activity + reward design first. Depends on the interaction system (M5) and real messaging. |
| DW-B02 | Achievements with unlock rules and a panel | Requested 2026-10-17. Display is cheap; the unlock rules and persistence need deciding. Local mock is acceptable. |
| DW-B03 | Altar as an interactive group space | FR-027. Deferred product feature; requires presence and group conversation delivery. |
| DW-B04 | Personalised interiors (a distinct room per contact) | The shared template (DW-051) is deliberate for this phase. |
| DW-B05 | Player identity: name and a personal avatar | Currently a generic character. Needs an account concept. |
| DW-B06 | Audio: footsteps, doors, ambient music | No audio assets exist and none are being sourced this phase. |
| DW-B07 | Touch controls and a genuine mobile layout | Desktop-first was chosen; the layout stays usable on small screens only. |
| DW-B08 | Automated test tooling (map data and interaction resolution are the first candidates) | No runner is configured; see ADR-0009. |
| DW-B09 | Pixel font for the HUD instead of `system-ui` | Optional; needs a CC0/OFL font file added and credited. |
| DW-B10 | Notifications and toasts | Low value until achievements exist (DW-B02). |

## How to update this board

1. Move a task to `In Progress` when you start it — and keep at most two there.
2. Set `Blocked` and add the reason when you cannot proceed.
3. Mark `Done` **only** when the acceptance criteria in `milestones.md` are met.
4. Update the per-milestone counters and the overall table in the same edit.
5. Add a line to [`daily-log.md`](daily-log.md) for the same day.
6. New tasks outside the current phase go to the backlog with a `DW-B##` id.
