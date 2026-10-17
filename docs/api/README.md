# API Reference

Documentation for Dwelling's HTTP endpoints and realtime events.

> ## ⚠️ Almost nothing here exists yet
>
> **One endpoint is implemented:** `GET /api/health`. It is documented below.
>
> Everything else in this file is a **placeholder** marked `Pending`. Do not
> build against a pending endpoint, and do not assume a pending endpoint's shape.
>
> The permitted sources of truth, in order: the code, then this file. If they
> disagree, the code wins — and this file is wrong and must be fixed.

---

## Conventions

| Aspect | Value | Source |
| --- | --- | --- |
| Base path | `/api` | `API_PREFIX` in `shared/src/index.js` — imported by both sides |
| Base URL (dev) | `http://localhost:3000` (backend), proxied from `http://localhost:5173` | `backend/src/config/env.js`, `frontend/vite.config.js` |
| Format | JSON | `express.json()` in `backend/src/app.js` |
| Realtime path | `/socket.io` on the same port | `backend/src/server.js` |
| Authentication | **None** | — |
| Versioning | **Undecided** | — |

**In frontend code, always use the relative `/api` prefix** — the Vite dev proxy
forwards it to the backend, so no absolute URL or CORS setup is needed
([`../architecture/frontend.md`](../architecture/frontend.md)).

---

## Status key

| Marker | Meaning |
| --- | --- |
| ✅ **Implemented** | In the code and documented below. |
| 🟡 **Partial** | Exists, but not usable for its intended purpose. |
| ▢ **Pending** | Planned, not implemented. The shape shown is a proposal. |
| ⏸ **Deferred** | Out of the current phase. |

---

## Implemented endpoints

### `GET /api/health`

Liveness check. Takes no parameters, returns a constant.

**Request**

```http
GET /api/health HTTP/1.1
```

**Response — `200 OK`**

```json
{ "status": "ok" }
```

**Notes**

- Implemented in `backend/src/app.js`; `backend/src/routes/README.md` states it
  stays there while the route surface is small.
- Touches no database, cache, or session — it proves the HTTP layer is up, nothing
  more.
- No error responses are defined; the handler cannot fail.

**Verify**

```bash
curl -i http://localhost:3000/api/health
```

---

## Pending endpoints

**None of the following are implemented. All shapes are proposals and will change.**

### `GET /api/me` ▢ Pending
The authenticated user. Depends on authentication, which does not exist.

### `GET /api/contacts` ▢ Pending
The current user's contacts. **Blocked on a product decision:** how contacts are
modeled is undecided ([`../architecture/database.md`](../architecture/database.md)).

### `GET /api/conversations` ▢ Pending
The user's conversations.

### `GET /api/conversations/:id/messages` ▢ Pending
Message history. Requirements to design: pagination, ordering, and a membership
check before returning anything
([`../architecture/security-and-caching.md`](../architecture/security-and-caching.md)).

### `POST /api/conversations/:id/messages` ▢ Pending
Send a message. Requires validation, authorization, and a rate limit.

### `GET /api/dwellings` ▢ Pending
Dwelling data for the world. **Undecided:** whether dwelling positions come from
the server at all, or live in frontend map data
([`../design/maps.md`](../design/maps.md)).

### `GET /api/maps` ▢ Pending
Map definitions. **Undecided:** maps may never become server data.

### `GET /api/altars` ⏸ Deferred
Altars are out of scope (FR-026, FR-027).

---

## Realtime events

**The only event in the codebase is `server:ready`.** It is emitted by
`backend/src/sockets/index.js` when a client connects; nothing on the client
listens for it. No client currently opens a socket connection.

Design constraints for future events — separate namespaces per concern, small
JSON payloads, server-side validation, and documentation here before shipping —
are in [`../architecture/realtime.md`](../architecture/realtime.md).

| Event | Direction | Status | Purpose |
| --- | --- | --- | --- |
| `server:ready` | server → client | 🟡 Partial | Emitted on connection. No client consumer exists. |
| _Messaging events_ | both | ▢ Pending | Not named or designed yet — see [`../architecture/realtime.md`](../architecture/realtime.md). |
| _Presence events_ | server → client | ⏸ Deferred | FR-029. |
| _Movement events_ | both | ⏸ Deferred | Authority model is undecided. |
| _Altar events_ | both | ⏸ Deferred | FR-026, FR-027. |

**Do not invent event names in code before they are designed and documented
here.** An undocumented event is an integration bug waiting to happen.

---

## Error format

**Undecided.** There is no error-handling middleware, so Express's default
handler responds to thrown errors. A consistent error shape must be designed
together with the first real endpoint, then documented here.

Requirements to satisfy when it is designed:

- A stable machine-readable error code, not just a message.
- HTTP status codes that mean what they say (`400` vs. `401` vs. `403` vs. `404`
  vs. `409` vs. `429`).
- **No internal details, stack traces, or query text in responses.**

---

## How to document a new endpoint

Add it to this file **in the same change** that implements it:

1. Move it out of *Pending* into *Implemented*.
2. Document: method, path, purpose, parameters, request body, success response,
   error responses, and the authorization rule enforced.
3. State how to verify it (a `curl` command or a UI action).
4. If it caches anything, state the key, TTL, and invalidation trigger
   ([`../architecture/security-and-caching.md`](../architecture/security-and-caching.md)).
5. If it emits or consumes a socket event, document the event here too.

## Related

- [`../architecture/backend.md`](../architecture/backend.md) — backend layering
- [`../architecture/realtime.md`](../architecture/realtime.md) — realtime design
- [`../architecture/security-and-caching.md`](../architecture/security-and-caching.md) — auth and validation rules
- [`../architecture/database.md`](../architecture/database.md) — entities endpoints expose
