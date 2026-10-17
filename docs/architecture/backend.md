# Backend Architecture

The intended backend boundaries. **The backend works, but does very little**, and
no backend features are being added in the current phase.

> **Scope reminder:** the ten-day plan is frontend-only. This document exists so
> the boundaries are fixed before they are needed and so they are not violated
> later — reading it is fine;
> starting work from it is not, until the frontend milestone is Done
> ([`../project/scope.md`](../project/scope.md)).

---

## What actually exists

Every backend file, verified by inspection:

```text
backend/src/
├── server.js              ✅  http.createServer(app) + Socket.IO Server (CORS: env.clientOrigin)
│                              registers socket handlers, connects cache, listens on env.port
├── app.js                 ✅  express(), express.json(), GET /api/health → { status: 'ok' }
├── config/env.js          ✅  loads root .env via dotenv; exports { port, clientOrigin }
├── cache/index.js         ✅  Redis behind connectCache/getCache/setCache/closeCache; no-ops without REDIS_URL
├── db/prisma.js           ✅  exports a single `new PrismaClient()`
├── sockets/index.js       ✅  registerSocketHandlers(io): on connection → socket.emit('server:ready')
├── sockets/README.md      ▢   boundary note only
├── routes/README.md       ▢   boundary note only
└── db/README.md, cache/README.md   ▢ boundary notes
```

- **Scripts:** `dev` → `node --watch src/server.js`, `start` → `node src/server.js`.
- **Package:** `"type": "module"` (ES modules), private.
- **Dependencies:** `express`, `socket.io`, `@prisma/client`, `dotenv`, `redis`,
  `@dwelling/shared`.
- **The only endpoint is `GET /api/health`.**
- **There is no middleware for auth, validation, rate limiting, logging, or error
  handling** — not even a 404 or error handler.

**Nothing in the frontend calls the backend.** `database/` has no migrations, so
even a working Prisma query would fail against an unmigrated database.

---

## Layering

The layering is already established by [`../architecture.md`](../architecture.md)
and the folder READMEs. Applied consistently:

```text
transport            domain / data              infrastructure
─────────            ─────────────              ──────────────
routes/              modules that apply         db/prisma.js  → PostgreSQL
sockets/             business rules and         cache/index.js → Redis (optional)
                     coordinate queries
   │                        │                          │
   └── parse input ─────────▶┴──── call ────────────────┘
       emit output
```

**Rules (from `../architecture.md`, restated as constraints):**

1. Route handlers and socket handlers **must not** embed persistence logic — they
   call domain/data modules.
2. Domain modules **must not** know about `req`, `res`, or socket objects; they
   take plain values and return plain values.
3. Redis access stays behind `backend/src/cache/` so the cache implementation can
   change without feature code depending on Redis.
4. Prisma access stays behind `backend/src/db/`.
5. `shared/` is imported, never imported *from* — it must not depend on a
   workspace.

**What this means today:** there is no domain layer yet, because there is no
domain behavior. When the first real endpoint arrives, it introduces
`backend/src/<domain>/` modules rather than putting logic in `app.js`.

---

## HTTP API

**Only one endpoint exists:**

| Method | Path | Response | Source |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `{ "status": "ok" }` | `backend/src/app.js` |

- The `/api` prefix comes from `@dwelling/shared` (`API_PREFIX`), so both sides
  agree on the base path.
- The health route currently lives in `app.js`; `backend/src/routes/README.md`
  states it stays there "while the route surface is small". Move it to
  `routes/` when real routes arrive.

**Everything else is pending.** Planned (not implemented) endpoint areas are
listed in [`../api/README.md`](../api/README.md) and are explicitly marked as
pending there.

---

## Realtime

`sockets/index.js` registers a connection handler that emits `server:ready` to
the connecting client. That is the entire realtime surface. The intended
separation of messaging, presence, movement, and group interactions is in
[`realtime.md`](realtime.md).

- **Confirmed:** CORS origin for sockets is `env.clientOrigin`
  (`CLIENT_ORIGIN`, default `http://localhost:5173`).
- **Confirmed:** Socket.IO and HTTP share the same Node HTTP server, so the
  Socket.IO endpoint is `/socket.io` on the same port (`3000`).

---

## Configuration

`backend/src/config/env.js` loads the **root** `.env` by resolving
`../../../.env` relative to itself, then exports:

| Key | Default | Source |
| --- | --- | --- |
| `port` | `3000` | `process.env.PORT`, coerced with `Number()` |
| `clientOrigin` | `http://localhost:5173` | `process.env.CLIENT_ORIGIN` |

- **Only these two values are read through the config module.**
  `DATABASE_URL` and `REDIS_URL` are read directly by Prisma and
  `backend/src/cache/index.js` respectively.
- **Proposed:** as the surface grows, all environment reads should funnel through
  `config/env.js` so configuration is inspectable in one place.
- **Required:** secrets stay out of source control (NFR-011). `.env` is
  gitignored; `.env.example` documents the shape only.

See [`../development/setup.md`](../development/setup.md).

---

## Error handling and shutdown

- **Today:** none. There is no error-handling middleware, and no `SIGINT`/`SIGTERM`
  handling to close the HTTP server, Prisma, or Redis.
- **Proposed boundaries for later:**
  - A single Express error-handling middleware as the last `app.use`.
  - A 404 handler for unmatched `/api` routes.
  - Graceful shutdown that stops accepting connections, then closes
    `closeCache()` and `prisma.$disconnect()`.
  - Domain modules throw typed/plain errors; transport decides the status code.
- **Why it matters:** `closeCache()` already exists and is **never called**, which
  is a real (if harmless) gap — nothing shuts it down.

---

## What the backend must never do

- Hold Socket.IO event logic inside HTTP route handlers, or vice versa.
- Import from `frontend/`. The dependency direction is one-way
  (see [`overview.md`](overview.md#dependency-direction)).
- Trust client input without validation once real endpoints exist — see
  [`security-and-caching.md`](security-and-caching.md).
- Contain caching decisions inside feature code instead of behind
  `backend/src/cache/`.

## Related

- [`overview.md`](overview.md) — system-wide view
- [`database.md`](database.md) — schema-level concepts
- [`realtime.md`](realtime.md) — planned realtime separation
- [`security-and-caching.md`](security-and-caching.md) — validation, auth, caching
- [`../api/README.md`](../api/README.md) — endpoint documentation (pending)
- [`../architecture.md`](../architecture.md) — original module-boundary note
