# Backend Architecture

The intended backend boundaries and the HTTP surface that actually exists.

The backend currently provides health, signup, login, logout, session lookup
(`GET /api/auth/me`), and contact listing (`GET /api/contacts`). Contacts,
canonical conversation lookup, and paginated message history exist as services;
conversation and message routes are not implemented.

> **Scope reminder:** the ten-day plan is frontend-only. This document exists so
> the boundaries are fixed before they are needed and so they are not violated
> later — reading it is fine; starting work from it is not, until the frontend
> milestone is Done ([`../project/scope.md`](../project/scope.md)).

---

## What actually exists

Every backend file, verified by inspection:

```text
backend/src/
├── server.js              ✅  http.createServer(app) + Socket.IO Server (CORS: env.clientOrigin)
│                              validates required env, registers socket handlers, connects cache, listens
├── app.js                 ✅  createApp(): Helmet, CORS, global rate limiter, Content-Type guard,
│                              JSON + cookie parsing, Origin guard, auth router, health, error handler, JSON 404
├── middleware/rateLimit.js ✅  express-rate-limit policies: global API and stricter credentials limiter
├── middleware/originCheck.js ✅  Origin/Referer enforcement → 403 ORIGIN_NOT_ALLOWED
├── config/env.js          ✅  loads root .env via dotenv; exports port, origins, URLs, JWT secret
├── config/validateEnv.js  ✅  requires JWT_SECRET; validates optional TEST_DATABASE_URL
├── routes/auth.js         ✅  createAuthRouter(): POST /signup, POST /auth/login, POST /auth/logout, GET /auth/me handlers
├── routes/contacts.js     ✅  createContactsRouter(): GET /contacts handler
├── auth/service.js        ✅  signupUser(), loginUser(), and getUserById()
├── auth/validation.js     ✅  signup and login field validation
├── auth/errors.js         ✅  ValidationError, EmailTakenError, InvalidCredentialsError
├── auth/jwt.js            ✅  signSessionToken / verifySessionToken
├── auth/cookies.js        ✅  setSessionCookie / clearSessionCookie / SESSION_COOKIE_NAME
├── auth/middleware.js     ✅  createRequireAuth / requireAuth (mounted on GET /auth/me)
├── contacts/service.js    ✅  addContact(), listContacts() — mirrored rows in one transaction
├── contacts/errors.js     ✅  SelfContactError, ContactUserNotFoundError
├── conversations/service.js ✅ canonicalPair(), getOrCreateConversation()
├── conversations/errors.js ✅ SelfConversationError, ConversationNotContactsError, ConversationUserNotFoundError
├── messages/service.js    ✅  listMessages() — participant-checked, newest-first keyset pages
├── messages/cursor.js     ✅  encodeMessageCursor(), decodeMessageCursor() — opaque base64url token
├── messages/errors.js     ✅  InvalidMessageLimitError, InvalidMessageCursorError, MessageConversationNotFoundError
├── cache/index.js         ✅  Redis behind connectCache/getCache/setCache/closeCache; no-ops without REDIS_URL
├── db/prisma.js           ✅  exports a single `new PrismaClient()`
├── sockets/index.js       ✅  registerSocketHandlers(io): on connection → socket.emit('server:ready')
├── sockets/README.md      ▢   boundary note only
├── routes/README.md       ▢   boundary note only
└── db/README.md, cache/README.md   ▢ boundary notes
```

- **Scripts:** `dev` → `node --watch src/server.js`, `start` → `node src/server.js`,
  `test` → `vitest run`.
- **Package:** `@dwelling/backend`, private, `"type": "module"` (ES modules).
- **Dependencies:** `express`, `socket.io`, `@prisma/client`, `dotenv`, `redis`,
  `cookie-parser`, `bcryptjs`, `jsonwebtoken`, `helmet`, `cors`,
  `express-rate-limit`, `@dwelling/shared`. Dev-only: `vitest`, `supertest`.
- **HTTP routes:** `GET /api/health`, `POST /api/signup`, `POST /api/auth/login`,
  `POST /api/auth/logout`, `GET /api/auth/me`, and `GET /api/contacts`. Signup and
  login issue the session cookie; logout clears it.
- **Implemented middleware, in order:** Helmet → CORS → global API rate limiter
  (health exempt) → Content-Type enforcement → JSON body parsing → cookie
  parsing → Origin/Referer guard → auth router (with the stricter credentials
  limiter on signup and login) → contacts router → health route → JSON 404
  catch-all → centralized error handler.
- **`createApp(options)`** builds the app and accepts `apiLimiter` and
  `credentialLimiter` overrides so tests can use fresh counters. The default
  export is the single production instance.
- **Rate limiting** uses `express-rate-limit`'s in-memory store: 300 requests
  per 15 minutes per IP across `/api`, and 10 per 15 minutes on signup/login.
  Counters are per process. `trust proxy` is intentionally unset until the
  deployment topology (OQ-14) is decided.
- **Origin handling:** CORS allows only `CLIENT_ORIGIN` with credentials, and a
  separate server-side check rejects state-changing requests without a matching
  `Origin`/`Referer` (`403 ORIGIN_NOT_ALLOWED`). CORS is not the CSRF control.

**Nothing in the frontend calls the backend.** The database has one applied
migration, so the auth queries can run against a migrated database.

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

**What this means today:** `backend/src/auth/` is the domain/data module for
signup, login, and session lookup; `routes/auth.js` parses transport input, calls
it, and manages the cookie. New features should follow that shape rather than
putting logic in `app.js`.

---

## HTTP API

| Method | Path | Response | Source |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `{ "status": "ok" }` | `backend/src/app.js` |
| `POST` | `/api/signup` | `201 { user }` and session cookie | `backend/src/routes/auth.js` |
| `POST` | `/api/auth/login` | `200 { user }` and session cookie | `backend/src/routes/auth.js` |
| `POST` | `/api/auth/logout` | `204` and cleared session cookie | `backend/src/routes/auth.js` |
| `GET` | `/api/auth/me` | `200 { user }` or `401 AUTH_REQUIRED` | `backend/src/routes/auth.js` |

- The `/api` prefix comes from `@dwelling/shared` (`API_PREFIX`), so both sides
  agree on the base path. The auth router is mounted at that prefix, which is why
  signup is `/api/signup` while login is `/api/auth/login`.
- Signup validates `{ email, password, displayName }`; duplicate email answers
  `409 EMAIL_TAKEN`.
- Login validates `{ email, password }`; unknown email and wrong password both
  answer the same `401 INVALID_CREDENTIALS`.
- Logout clears the cookie and always answers `204`, even without a valid session.
- `GET /api/auth/me` loads the session user from the token `sub` and returns only
  public fields; a token for a deleted user answers `401 AUTH_REQUIRED`, not `500`.
  Contact, conversation, and message **routes** are pending; the contract is in
  [`../api/README.md`](../api/README.md). The message-history service already
  enforces participation and pagination for that endpoint.

---

## Realtime

`sockets/index.js` registers a connection handler that emits `server:ready` to
the connecting client. That is the entire realtime surface. The intended
separation of messaging, presence, and movement is in
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
| `nodeEnv` / `isProduction` | `development` / `false` | `process.env.NODE_ENV` |
| `databaseUrl` | `undefined` | `process.env.DATABASE_URL` |
| `redisUrl` | `undefined` | `process.env.REDIS_URL` |
| `jwtSecret` | `undefined` | `process.env.JWT_SECRET` |

- **Required:** `JWT_SECRET` is checked by `config/validateEnv.js` before the
  server listens; it has no default. `DATABASE_URL` and `REDIS_URL` are optional
  at boot until those features are used.
- The demo seed is separate: it loads the root `.env.local` (for `DEMO_PASSWORD`
  and, if present, `DATABASE_URL`); `DATABASE_URL` must also be exported in the
  shell when it is not in that file.
- **Required:** secrets stay out of source control (NFR-011). The root `.env` and
  `.env.local` are gitignored; `backend/.env.example` (copied to the root)
  documents the shape with placeholders only.

See [`../development/setup.md`](../development/setup.md).

---

## Error handling and shutdown

- **Implemented:** the last `app.use` is a centralized error handler. It maps
  malformed JSON to `400 BAD_REQUEST`, `ValidationError` to `400
  VALIDATION_FAILED`, `EmailTakenError` to `409 EMAIL_TAKEN`, and
  `InvalidCredentialsError` to `401 INVALID_CREDENTIALS`. Anything else becomes a
  sanitized `500 INTERNAL`; the full error is logged server-side only outside
  production.
- **Implemented:** unmatched routes return JSON `404 NOT_FOUND`.
- **Not implemented:** `SIGINT`/`SIGTERM` handling to stop the server and close
  Prisma/Redis. `closeCache()` exists but is never called, which is a real (if
  harmless) gap.
- **Domain errors:** auth service modules throw typed errors; the transport layer
  chooses the status code.

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
- [`../api/README.md`](../api/README.md) — implemented and defined endpoints
- [`../architecture.md`](../architecture.md) — original module-boundary note
