# Requirements

Requirements are numbered so that tasks, milestones, tests, and decisions can
reference them. Each requirement is written to be **testable** — there is a
concrete way to observe whether it holds.

**Status key**

| Status | Meaning |
| --- | --- |
| `Done` | Implemented in the repository and verified. |
| `In progress` | Partly implemented. |
| `Planned` | Agreed, not started. |
| `Deferred` | Out of the current phase; see [`scope.md`](scope.md). |

_As of the current repository state, no product requirement below is `Done`.
The scaffold contains transport, config, and schema placeholders, not features._

---

## Functional requirements

### World and movement

| ID | Requirement | Status |
| --- | --- | --- |
| FR-001 | The app renders a 2D world in a Phaser canvas inside the World panel. | Planned |
| FR-002 | The player character is visible in the world at a defined spawn position. | Planned |
| FR-003 | The player can be moved with the arrow keys **and** WASD. | Planned |
| FR-004 | Movement is smooth and frame-rate independent (delta-time based). | Planned |
| FR-005 | Diagonal movement is normalized so it is not faster than straight movement. | Planned |
| FR-006 | The player cannot move through solid obstacles. | Planned |
| FR-007 | The player cannot leave the world boundaries. | Planned |
| FR-008 | The camera follows the player and does not show area outside the world bounds. | Planned |
| FR-009 | The player's facing direction is reflected visually at all times. | Planned |

### Dwellings and interaction

| ID | Requirement | Status |
| --- | --- | --- |
| FR-010 | Dwellings are rendered at configured positions in the world. | Planned |
| FR-011 | Each dwelling is associated with exactly one contact identity. | Planned |
| FR-012 | Each dwelling has an interaction zone the player can enter. | Planned |
| FR-013 | Entering an interaction zone shows visible, unambiguous feedback. | Planned |
| FR-014 | Pressing the interact key inside a zone triggers that dwelling's interaction. | Planned |
| FR-015 | An interaction resolves to the correct contact's conversation. | Planned |
| FR-016 | Leaving an interaction zone clears the interaction prompt. | Planned |

### Maps

| ID | Requirement | Status |
| --- | --- | --- |
| FR-017 | Contacts are grouped into maps by the first letter of their name, per fixed alphabet ranges. | Planned |
| FR-018 | Each map is defined by data (size, spawn, dwellings, obstacles), not hard-coded scene logic. | Planned |
| FR-019 | The game can load any registered map by id. | Planned |
| FR-020 | There is a mechanism to move between maps (transition or selection). | Planned |
| FR-021 | The current map is identified in the UI. | Planned |

### UI and chat

| ID | Requirement | Status |
| --- | --- | --- |
| FR-022 | The HTML UI around the canvas (header, panels) remains functional alongside the canvas. | Planned |
| FR-023 | Interacting with a dwelling opens a conversation UI for that contact. | Planned |
| FR-024 | The conversation UI shows the contact's name. | Planned |
| FR-025 | The conversation UI can be closed and returns focus to the world. | Planned |
| FR-026 | The Altar is rendered in the world as a visually distinct gathering location, positioned by map data. **Scenery only — it must not offer an interaction it cannot perform.** | Planned |
| FR-027 | An Altar supports interaction by multiple users in the same location. | Deferred |
| FR-028 | Users can send and receive messages in a conversation. | Deferred |
| FR-029 | The app shows which contacts are online (presence). | Deferred |

### Interiors

| ID | Requirement | Status |
| --- | --- | --- |
| FR-030 | The player can enter a dwelling's interior and exit back to that dwelling's door, without a page reload. | Planned |
| FR-031 | The shared interior contains a recognisable fireplace, kitchen area, and bed. | Planned |

### Conversation sidebar

| ID | Requirement | Status |
| --- | --- | --- |
| FR-032 | The conversation UI opens as a docked sidebar beside the world, covering no part of the canvas. | Planned |
| FR-033 | Any mock conversation content is visibly labelled as mock data, and no input field implies that sending works. | Planned |

---

## Non-functional requirements

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-001 | The frontend uses vanilla JavaScript, HTML5, CSS3, Vite, and Phaser 3 — no React, no TypeScript. | Planned |
| NFR-002 | Development runs on Node.js `>=20.19.0` (declared in the root `package.json`). | Planned |
| NFR-003 | `npm run dev` serves the frontend at `http://localhost:5173`. | Planned |
| NFR-004 | `npm run build` completes without errors or warnings that indicate a broken bundle. | Planned |
| NFR-005 | The world targets 60 FPS on a modern desktop browser with the sourced 16-bit asset set loaded. | Planned |
| NFR-006 | Initial world load is under ~3 seconds on a local development machine. | Planned |
| NFR-007 | The latest stable Chrome, Firefox, and Safari are supported. | Planned |
| NFR-008 | The layout remains usable down to 320px viewport width. | Planned |
| NFR-009 | All raster assets are PNG or WebP and individually kept small (target ≤ 512 KB). | Planned |
| NFR-010 | DOM UI is reachable and operable by keyboard, with visible focus states. | Planned |
| NFR-011 | No secret, credential, or environment-specific value is committed to source control. | Planned |
| NFR-012 | Module boundaries are respected: transport code does not contain persistence logic, and vice versa. | Planned |
| NFR-013 | Documentation is updated as part of each completed milestone. | Planned |
| NFR-014 | Every third-party asset's pack, author, license and source URL is recorded in `frontend/public/assets/CREDITS.md`, and its license permits use and redistribution. | Planned |
| NFR-015 | The app always starts in a working, demonstrable state — the frontend phase is graded partly on a live demonstration and a written report. | Planned |

---

## Traceability

- Requirements are grouped by theme; milestones in
  [`planning/milestones.md`](../planning/milestones.md) list the requirement IDs
  they satisfy.
- Scope for the current phase is defined in [`scope.md`](scope.md).
- Anything marked `Deferred` is intentionally out of the current **ten-day** plan
  (ADR-0014 in [`planning/decisions.md`](../planning/decisions.md)).
- Requirements added during the 2026-10-17 requirements session are FR-030 to
  FR-033 and NFR-014 to NFR-015; FR-026 was narrowed from "shared gathering
  location" to scenery-only for this phase.
