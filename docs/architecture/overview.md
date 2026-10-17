# Architecture Overview

How Dwelling's pieces fit together — and, just as importantly, **what actually
exists today versus what is only planned.**

> Short version of module boundaries: [`../architecture.md`](../architecture.md).
> That file predates this documentation set and remains authoritative for the
> backend's internal layering. This document covers the whole system.

## Status legend

| Marker | Meaning |
| --- | --- |
| ✅ **Exists** | Present in the repository and functional as scaffolding. |
| 🟡 **Partial** | Something is there, but the feature is not usable. |
| ▢ **Planned** | Designed in docs, not written. |

---

## What exists today

```text
✅  npm-workspace monorepo        root package.json (node >=20.19.0)
🟡  frontend/  Vite + React + Phaser 3  React UI + Phaser world;
          React components render panels, Phaser canvas renders world
🟡  backend/   Express + Socket.IO  /api/health works; sockets emit server:ready
🟡  database/  Prisma schema      models defined; NO migrations generated
✅  shared/    API_PREFIX only     single exported constant
✅  docs/      documentation       this tree
▢   tests/                        placeholder README; no test runner configured
▢   scripts/                      placeholder README; no scripts
```

**Key reality check:** the frontend now has React UI panels and a Phaser world
canvas. The starting point of the ten-day plan is integrating these two layers
through the DOM bridge.

---

## System diagram

### Target architecture (planned)

```text
┌─────────────────────────── Browser ────────────────────────────┐
│                                                                │
│   ┌────────────────────────┐   ┌───────────────────────────┐   │
│   │  Interface layer (React)│   │   World layer (Phaser)    │   │
│   │  ─────────────────────  │   │  ───────────────────────  │   │
│   │  React components      │   │  scenes: Boot/Preload/    │   │
│   │  panels, HUD, chat UI  │   │  World, entities, physics │   │
│   └────────────────────────┘   └───────────────────────────┘   │
│                ▲                          ▲                    │
│                └──── DOM bridge (events) ─┘                    │
│                            │                                   │
│                     client services                            │
│              (HTTP fetch · Socket.IO client)                   │
└────────────────────────────┼───────────────────────────────────┘
                             │  /api (HTTP)   /socket.io (WS)
                             ▼
┌──────────────────────── Backend ───────────────────────────────┐
│  routes/  ──▶ domain logic ──▶ db/ (Prisma)   ──▶ PostgreSQL   │
│  sockets/ ──▶ domain logic ──▶ cache/ (Redis, optional)        │
└────────────────────────────────────────────────────────────────┘
```

### Current architecture (actual)

```text
┌─────────────────────────── Browser ────────────────────────────┐
│   App.jsx  →  React root, mounts App component                 │
│             →  React UI panels + Phaser world canvas           │
│   WorldScene.jsx  →  Phaser world scene                      │
│   ChatScene.jsx   →  Phaser chat scene                       │
│              no manual DOM queries — bridge handles events      │
└────────────────────────────────────────────────────────────────┘
                             ✗  nothing connects fully yet
┌──────────────────────── Backend (runs, but unused by the UI) ──┐
│   app.js     GET /api/health  →  { status: 'ok' }              │
│   sockets/   on connection    →  emit 'server:ready'           │
│   cache/     no-ops unless REDIS_URL is set                    │
│   db/        PrismaClient singleton (nothing queries it)       │
└────────────────────────────────────────────────────────────────┘
        database/  schema only — no migrations, no data
```

The Vite dev server **is** configured to proxy `/api` and `/socket.io` to
`http://localhost:3000` (`frontend/vite.config.js`), so the connection path is
already prepared even though nothing uses it fully yet.

---

## Layer responsibilities

| Layer | Owns | Must not |
| --- | --- | --- |
| **World (Phaser)** | Rendering the world, the player, movement, collision, camera, interaction zones | Contain HTML UI, call HTTP/socket APIs, read DOM internals directly |
| **DOM bridge** | Translating world events ↔ interface events | Contain game logic or network calls |
| **Interface (DOM)** | Panels, HUD, conversation UI, forms, focus | Draw world content or run the game loop |
| **Client services** | HTTP and Socket.IO communication | Touch scene or DOM internals |
| **Backend routes/sockets** | Parsing transport input, emitting events | Hold persistence logic |
| **Backend domain/data** | Business rules, query orchestration | Know about HTTP requests or sockets |
| **`database/`** | Schema and migrations | Contain application logic |
| **`shared/`** | Environment-independent constants and contracts | Import from a workspace that depends on it |

This is the same boundary described in [`../architecture.md`](../architecture.md):
route and socket handlers call domain/data modules rather than embedding
persistence, and Redis stays behind `backend/src/cache/`.

---

## Data flow for the target interaction

The path a dwelling interaction should eventually take:

```text
1. Player moves into a dwelling's interaction zone        [World]
2. World emits "near contact X"                            [World → bridge]
3. Bridge updates the HTML prompt                          [bridge → DOM]
4. Player presses the interact key                         [World]
5. World emits "interact with contact X"                   [World → bridge]
6. DOM opens the conversation panel for X                  [DOM]
       └─ later: client service requests history           [service → /api]
             and subscribes to the conversation            [service → socket.io]
```

**In this phase only steps 1–6 (with a placeholder panel) are in scope.** Steps
involving `service → /api` and `socket.io` are deferred.

---

## Dependency direction

Dependencies point **inward and downward** — nothing here should require a cycle:

```text
shared/  ←──────────  frontend/   (imports @dwelling/shared)
   ↑
   └───────────────  backend/     (imports @dwelling/shared)

frontend/  ──HTTP/WS──▶  backend/  ──▶  database/   (Prisma → PostgreSQL)
                                       └─▶  Redis (optional, behind cache/)
```

Within the frontend, the intended direction is:

```text
config/constants  ←  scenes  ←  entities
       ↑                ↑
    assets/keys     systems/  ←  (movement, interaction)
                        ↑
                    game.js  (entry)
       DOM bridge  ←────┘  ────▶  UI modules
```

**Rule:** entities do not import scenes or the game config; they receive what
they need. This keeps them testable and prevents circular imports.

---

## Environments and configuration

- **Confirmed:** root `.env` is loaded by the backend via
  `backend/src/config/env.js`, which reads `PORT` and `CLIENT_ORIGIN`
  (defaults `3000` and `http://localhost:5173`).
- **Confirmed:** `.env.example` documents `PORT`, `CLIENT_ORIGIN`, `DATABASE_URL`,
  and an optional `REDIS_URL`.
- **Confirmed:** the frontend does **not** read any environment variable today.
  Any `VITE_*` variable would be new, and must be documented when introduced.
- **Required:** secrets never enter source control (NFR-011).

See [`../development/setup.md`](../development/setup.md) for the real commands.

---

## Deployment

**Out of scope.** There is no deployment configuration, no CI, and no hosting
decision. The project currently targets local development only (see
[`../project/scope.md`](../project/scope.md)).

---

## Related documents

| Topic | Document |
| --- | --- |
| Frontend internals | [`frontend.md`](frontend.md) |
| Backend boundaries | [`backend.md`](backend.md) |
| Data model concepts | [`database.md`](database.md) |
| Realtime plan | [`realtime.md`](realtime.md) |
| Security & caching | [`security-and-caching.md`](security-and-caching.md) |
| Module boundaries (original) | [`../architecture.md`](../architecture.md) |
| Repository layout | [`../development/folder-structure.md`](../development/folder-structure.md) |
