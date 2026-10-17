# Frontend Architecture

How the browser application is organized: **React**, **HTML**, **CSS3**, bundled by **Vite**, with **Phaser 3** for the 2D world.

> **React is now the UI framework.** See the updated ADR decisions in
> [`../planning/decisions.md`](../planning/decisions.md).
> TypeScript is optional but Vanilla JS within React is the default.
>
> Most of the structure below is **proposed** — the frontend today is a single
> static `main.js`. Anything implemented is marked ✅.

---

## Current state

```text
frontend/
├── index.html            ✅  #root mount point, loads /src/main.js
├── vite.config.js        ✅  @vitejs/plugin-react; dev proxy: /api and /socket.io → :3000
├── package.json          ✅  scripts: dev, build, preview · deps: phaser, react, react-dom, socket.io-client
├── public/
│   ├── favicon.svg       ✅
│   └── icons.svg         ✅
└── src/
    ├── main.js           ✅  creates the React root, renders App
    ├── App.jsx           ✅  mounts the Phaser game; World panel + Conversations sidebar
    ├── style.css         ✅  grid layout, responsive below 700px
    ├── assets/           🟡  Vite starter leftovers (unused)
    ├── world/
    │   ├── game.js       ✅  createGame(parent) — the only Phaser config (DW-003)
    │   ├── constants.js  ✅  tile/world/viewport sizes (DW-008)
    │   ├── assets.js     ✅  texture keys, paths, manifest, loadAssets() (DW-046)
    │   └── scenes/       ✅  BootScene, PreloadScene, WorldScene (DW-004/005)
    ├── bridge/           ✅  React ↔ Phaser event bus (DW-035 groundwork)
    └── chat/README.md    ▢   boundary only — no code
```

**Phaser renders a real tiled world** (verified 2026-10-17, Day 2): `WorldScene`
draws a 60×40 ground layer from the Kenney Tiny Town tileset (`public/assets/`),
with physics and camera bounds taken from `constants.js`. `PreloadScene` loads a
declarative asset manifest with a progress bar and reports missing assets by
required/optional status. There is still no player or interaction — those arrive
in later milestones.

---

## Module responsibilities

The split below extends the boundary already established by
`frontend/src/world/README.md` ("keep world rendering and movement separate from
chat and network transport") and `frontend/src/chat/README.md` ("realtime
transport should be kept in a separate client module").

| Area | Responsibility | Location | Status |
| --- | --- | --- | --- |
| **Entry** | Bootstrap the app: mount the game, wire UI | `src/main.js`, `src/App.jsx` | ✅ mounts the game |
| **Game config** | Phaser config: parent, size, scale, physics, scene list | `src/world/game.js` | ✅ DW-003 |
| **Constants** | Tile size, world size, speeds, depths — defined once | `src/world/constants.js` | ✅ DW-008 |
| **Asset keys** | Texture keys mapped to file paths | `src/world/assets.js` | ✅ DW-046 |
| **Scenes** | Lifecycle units (`preload`, `create`, `update`) | `src/world/scenes/` | ✅ DW-004/005 |
| **Entities** | Player, dwelling — sprite + behavior | `src/world/entities/` | ▢ DW-014, DW-026 |
| **Systems** | Cross-entity logic: movement, interaction resolution | `src/world/systems/` | ▢ DW-015, DW-028 |
| **Maps** | Map data, registry, loading | `src/world/maps/` | ▢ DW-032/033 |
| **Bridge** | Canvas ↔ DOM event translation | `src/bridge/` | ✅ exists (DW-035 settles details) |
| **UI** | Panels, HUD, prompts as DOM | `src/ui/` (proposed) | ▢ DW-036/037 |
| **Chat** | Conversation UI | `src/chat/` | ▢ placeholder only |
| **Services** | HTTP + Socket.IO clients | `src/services/` (proposed) | ▢ deferred |

> **The existing `world/` and `chat/` folders are treated as fixed boundaries.**
> The layouts above are additions inside them, not replacements. `bridge/`,
> `ui/`, and `services/` are proposals — settle them in DW-035 before creating
> them, and update [`../development/folder-structure.md`](../development/folder-structure.md)
> in the same change.

---

## Scenes

Phaser scenes are the unit of lifecycle. Proposed split (DW-004/DW-005):

| Scene | Purpose | Status |
| --- | --- | --- |
| `BootScene` | Minimal startup; anything needed before a loading screen exists | ✅ stub |
| `PreloadScene` | Load assets and show a progress indicator (DW-012) | ✅ stub |
| `WorldScene` | The world: ground, bounds, obstacles, dwellings, player, interaction | ✅ placeholder |

**Rules**

- Scene must be registered in the config's scene list (DW-005) — an unregistered
  scene silently never runs.
- Scenes orchestrate; they do not contain entity internals. A scene creates
  entities and systems, then delegates in `update`.
- A scene must not call `fetch`, `io()`, or touch DOM elements directly. Those
  cross the bridge or a service.

---

## Entities

An entity owns its sprite and its own behavior:

- **Player** (DW-014) — position, facing, velocity, movement input.
- **Dwelling** (DW-026) — position, contact id, interaction zone, prompt state.

**Rules**

- An entity receives its scene and configuration through its constructor; it does
  not import the game config or reach for global state.
- An entity must not decide *who* the player is talking to. Interaction
  *resolution* (which dwelling is active) belongs to a system, so the rule can
  change in one place.
- Placeholder textures are generated in code until real art exists (ADR-0007).

---

## Game systems

Systems hold logic that spans entities and is easy to reason about in isolation:

- **Movement** (DW-015/DW-016) — reads input, applies normalized, delta-time
  velocity to the player.
- **Interaction** (DW-028/DW-029/DW-030) — tracks which dwellings' zones the
  player overlaps, picks a single active target, shows/hides the prompt, and
  emits an interaction event.

**Why systems rather than entity methods:** overlap resolution and prompt
visibility are inherently cross-dwelling concerns. Keeping them out of
`Dwelling` avoids every dwelling needing to know about every other dwelling.

**Proposed:** systems are plain functions/objects created per scene and called
from `update`, rather than classes with their own state machine. Keep it simple.

---

## State

- **There is no state-management library and none is planned** — React local
  state and the bridge are enough (ADR-0016).
- State lives in three places, deliberately:
  1. **Scene state** — the active map, entities, systems (source of truth for the
     world).
  2. **Session state** — the current player identity and selected map, in a small
     module (proposed `src/state/`). ▢ **Undecided** until needed.
  3. **DOM state** — whether a panel is open, and its contents.
- **Rule:** DOM state must never be the source of truth for world state, and
  world state must not be read by querying the DOM. They sync through the bridge.

---

## The DOM bridge

The single seam between canvas and HTML (ADR-0005).

- **Confirmed:** it is a dedicated module, not ad-hoc DOM access from scenes
  (DW-035).
- **Proposed:** a minimal event bus — `emit(eventName, payload)` /
  `on(eventName, handler)` — with named events such as `dwelling:near`,
  `dwelling:interact`, `map:changed`.
- **Rules:**
  - Scenes may `emit`; they must not import UI modules.
  - UI modules may subscribe; they must not import scenes.
  - Event payloads are plain data (ids, names) — never sprites, scenes, or DOM
    nodes.
  - The bridge contains no game logic and no network calls.

**Undecided:** whether to reuse Phaser's own event emitter or use `EventTarget`
/ a tiny custom emitter. Decide in DW-035 and record it.

---

## Client services

**Deferred.** No `fetch` or `io()` call exists in the frontend today.

- **Proposed location:** `src/services/` — `api.js` for HTTP and `realtime.js`
  for Socket.IO.
- **Confirmed by existing config:** requests go to the relative `/api` prefix
  (`API_PREFIX` from `@dwelling/shared`) and the Socket.IO client connects to
  `/socket.io`; both are proxied to `localhost:3000` by `vite.config.js`.
- **Rule:** services never touch the DOM or Phaser. They return data; the caller
  decides how to display it.

See [`realtime.md`](realtime.md).

---

## Styling

- **Confirmed:** plain CSS in `frontend/src/style.css` (imported by `main.js`).
  No CSS framework, no preprocessor.
- **Proposed:** keep global layout in `style.css`; if a component's styles grow,
  give it its own CSS file imported by its module. CSS is bundled by Vite the
  same way JS is.
- **Confirmed:** the existing responsive breakpoint is **700px** (below it, the
  two panels stack) and the layout must work at **320px** (NFR-008).
- **Undecided:** class-naming convention. See
  [`../development/coding-conventions.md`](../development/coding-conventions.md).

---

## Build and development tooling

| Command | Effect |
| --- | --- |
| `npm run dev` (root) | Runs `vite` in the `frontend` workspace → `http://localhost:5173` |
| `npm run build` (root) | Runs `vite build` → `frontend/dist/` |
| `npm run dev --workspace @dwelling/frontend -- --host` | Vite with flags, if needed |

- **Confirmed:** `vite.config.js` proxies `/api` and `/socket.io` (with
  `ws: true`) to `http://localhost:3000`.
- **No path alias** is configured: imports use relative paths. See
  [`../development/coding-conventions.md`](../development/coding-conventions.md).
- **Verified (2026-10-17):** `frontend/package.json` pins `vite ^8.3.0`, and
  **`vite@8.3.1` is installed and `npm run build` passes** (≈79 ms, output in
  `frontend/dist/`). `phaser@3.90.0` is installed too. What remains unverified is
  that **Phaser renders when imported** — that is DW-002, not a version problem.

---

## Constraints

- **Phaser**
  - Version: `^3.90.0`.
  - Imported as an **ES module**: `import Phaser from 'phaser'`.
  - **Never** load Phaser from a CDN `<script>` tag — it breaks bundling and
    bypasses the dependency lock.
- **React is the UI framework** (ADR-0016), with plain JavaScript (no
  TypeScript by default; TypeScript is optional and can be added later —
  NFR-001). Do not introduce Vue or Svelte.
- **Modules** — ES modules only (`import`/`export`); the package is
  `"type": "module"`.

## Related

- [`../design/ui-ux.md`](../design/ui-ux.md) — canvas/HTML split in practice
- [`../design/game-world.md`](../design/game-world.md) — mechanics the scenes implement
- [`realtime.md`](realtime.md), [`backend.md`](backend.md)
- [`../development/folder-structure.md`](../development/folder-structure.md), [`../development/coding-conventions.md`](../development/coding-conventions.md)
