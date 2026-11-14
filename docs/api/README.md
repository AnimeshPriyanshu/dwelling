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
| Base path | `/api` | `API_PREFIX` in `shared/src/index.js` — imported by the backend only |
| Base URL (dev) | `http://localhost:3000` (backend), reached as `/api` from `http://localhost:5173` | `backend/src/config/env.js`, `frontend/vite.config.js` |
| Format | JSON request and response bodies | `express.json()` in `backend/src/app.js` |
| Realtime path | `/socket.io` on the same port | `backend/src/server.js` |
| Authentication | Session JWT in an HttpOnly cookie — see below | ADR-0022 |
| Versioning | **None in v1** — no `/v1` segment, no version header | This contract; no versioning PR exists in `plan.md` |
| Resource ids | Opaque `cuid()` strings, treated as strings by clients | `database/prisma/schema.prisma` |

**In frontend code, always use the relative `/api` prefix** — the Vite dev proxy
forwards it to the backend, so no absolute URL or CORS setup is needed
([`../architecture/frontend.md`](../architecture/frontend.md)). The frontend
currently makes **no** network calls; the `API_PREFIX` constant is not imported
there.

---

## Status key

| Marker | Meaning |
| --- | --- |
| ✅ **Implemented** | In the code and documented below. |
| ▢ **Defined** | Contract agreed and reviewable, but **no code exists**. The shape is binding for implementation; behavior is not testable yet. |
| ▢ **Pending** | Planned, shape not agreed. Do not build against it. |
| 🟡 **Partial** | Exists, but not usable for its intended purpose. |
| ⏸ **Deferred** | Out of the current phase. |
| ⛔ **Not supported** | Ruled out by a decision; not planned at all. |

**`▢ Defined` is not `✅ Implemented`.** Do not call a defined endpoint from the
frontend until the PR that implements it has moved it to *Implemented* and
documented how to verify it.

---

## Authentication and sessions

Decided in **ADR-0022** ([`../planning/decisions.md`](../planning/decisions.md#adr-0022--jwt-authentication-using-an-httponly-cookie)). No authentication code exists yet; this is the contract.

### Cookie

| Attribute | Value |
| --- | --- |
| Name | `dwelling_session` |
| Value | Signed JWT (`HS256`, `JWT_SECRET`) |
| `HttpOnly` | Yes — never read by JavaScript |
| `SameSite` | `Lax` |
| `Secure` | Yes in production (`NODE_ENV=production`), otherwise absent so local HTTP works |
| `Path` | `/` |
| `Max-Age` | `604800` (7 days), matching the token `exp` |

Claims: `sub` (user id), `iat`, `exp`. No email, display name, or role is stored
in the token, so profile changes never require re-issuing it.

### Lifecycle

- **Signup** and **login** set the cookie in their response.
- **Logout** clears it (same attributes, `Max-Age=0`) and always returns `204`.
- `GET /api/auth/me` is the only way a client learns who it is; there is no
  token introspection endpoint.
- **There is no refresh token and no sliding session.** The session ends 7 days
  after issue, or when the user logs in again.
- **There is no revocation.** Clearing the cookie removes it from that browser
  only. An already-issued JWT remains valid until `exp`; a copied cookie can be
  replayed until then. A denylist, token-version column, or password-change
  invalidation is **not** part of v1 and needs a later decision.

### CSRF

Cookie authentication reintroduces cross-site request forgery, which bearer
tokens in a header do not have. The v1 posture:

- **JSON-only.** Every state-changing request must carry `Content-Type:
  application/json`; form-encoded and `text/plain` bodies are rejected. A
  cross-site HTML form cannot produce that content type, and a cross-origin
  `fetch` with it is stopped by CORS preflight.
- **Origin validation.** State-changing requests that rely on the session cookie
  must carry an `Origin` (or `Referer`) matching `CLIENT_ORIGIN`; a missing or
  foreign origin is rejected. This is enforced server-side at the transport
  boundary (PR-27).
- **No CSRF token in v1.** This is a deliberate deferral, not a claim that
  `SameSite=Lax` is sufficient on its own.
- **`SameSite=Lax` limits.** It stops cookies on cross-site subrequests and
  cross-site form POSTs, but it does **not** protect against same-site attackers
  (a compromised sibling subdomain) or XSS on the app's own origin, and it does
  not apply to clients that ignore the attribute.
- **Cross-site deployment changes the answer.** If the production frontend and
  API are on different sites, `Lax` prevents the cookie from being sent at all,
  forcing `SameSite=None; Secure` — which removes the main built-in protection
  and makes a CSRF token mandatory. Deployment topology is **OQ-14**: it must be
  settled before launch and the CSRF posture reassessed at PR-27.

### Client rules

- Never read, copy, or persist the session token. It is `HttpOnly` by design.
- Never store credentials or tokens in `localStorage` or `sessionStorage`.
- Always send requests with credentials enabled (`credentials: 'include'` in
  `fetch`) once a client is built; without it the cookie is omitted cross-origin.
- Treat `401 AUTH_REQUIRED` as "session over" and route to sign-in; do not retry
  in a loop.

---

## Implemented endpoints

### `GET /api/health` ✅ Implemented

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

**Verify**

```bash
curl -i http://localhost:3000/api/health
```

---

## Defined endpoints — not implemented

The twelve endpoints below are the agreed Phase 2–7 contract. They are grouped by
the PRs that implement them (`plan.md` Phases 3, 5, 7). All of them:

- **Auth:** session cookie required, unless the endpoint says otherwise
- **Resolve the caller** from the cookie, never from a body or query value
- **Return JSON** on success and on every defined error
- **Use the error codes** in [Error format](#error-format), with the wire envelope
  owned by PR-12

### Authentication (PR-19 – PR-29)

All auth endpoints use session cookie authentication.

#### `POST /api/auth/signup` ▢ Defined

Create an account and start a session.

- **Auth:** none.
- **Body:** `{ "email": string, "password": string, "displayName": string }`
- **Success — `201 Created`:** `{ "user": User }` and `Set-Cookie: dwelling_session=…`
- **Errors:** `400 VALIDATION_FAILED`, `409 EMAIL_TAKEN`
- **Notes:** signing up logs the user in. Email uniqueness, normalization, and
  password rules are validation mechanics and belong to PR-12/PR-23; this
  contract fixes only the field names. `displayName` uniqueness is **OQ-1**.

#### `POST /api/auth/login` ▢ Defined

Exchange credentials for a session cookie.

- **Auth:** none.
- **Body:** `{ "email": string, "password": string }`
- **Success — `200 OK`:** `{ "user": User }` and `Set-Cookie: dwelling_session=…`
- **Errors:** `400 VALIDATION_FAILED`, `401 INVALID_CREDENTIALS`
- **Notes:** unknown email and wrong password return the **same** `401` body.
  Login does not reveal whether an address is registered. A successful login
  replaces any existing cookie.

#### `POST /api/auth/logout` ▢ Defined

Clear the session cookie.

- **Auth:** optional. A request without a valid cookie still succeeds, so a
  stale client can always clear itself.
- **Body:** none.
- **Success — `204 No Content`:** no body; `Set-Cookie` expires
  `dwelling_session` with the same `Path`, `SameSite`, and `Secure` attributes.
- **Errors:** none defined.
- **Notes:** **this does not invalidate the token.** Logout removes the cookie
  from this browser; an already-issued JWT stays valid until `exp`, and there is
  no server-side session store to delete (ADR-0022). Clients must discard local
  state and treat the user as signed out; only revocation — not built in v1 —
  would make the token unusable elsewhere.

#### `GET /api/auth/me` ▢ Defined

Return the authenticated user. The canonical replacement for the old
`GET /api/me` placeholder.

- **Auth:** session cookie required.
- **Success — `200 OK`:** `{ "user": User }`
- **Errors:** `401 AUTH_REQUIRED`
- **Notes:** the only session-bootstrap endpoint. It reads `sub` from the JWT and
  loads the user; a token for a deleted user is `401`, not `500`. Used by PR-31.

**User** = `{ id, email, displayName, createdAt }`. The email is returned only to
the user themselves; no other endpoint exposes it. `email` is part of the target
schema and arrives with PR-15 — the current Prisma sketch has no email column, so
nothing can be implemented against this shape yet.

### Contacts (PR-36 – PR-42)

Contacts are mutual and immediate (ADR-0021). There is no request, accept, or
pending state, and no endpoint returns a `Contact` row.

#### `GET /api/contacts` ▢ Defined

List the caller's contacts.

- **Auth:** session cookie required.
- **Parameters:** none.
- **Success — `200 OK`:**

```json
{ "contacts": [ { "user": { "id": "clx0user2", "displayName": "Bo" } } ] }
```

- **Errors:** `401 AUTH_REQUIRED`
- **Notes:** one entry per relationship, never a mirrored duplicate. The response
  deliberately contains no contact timestamp and no email in v1; whether a
  timestamp is ever returned is left open for a later version. List ordering is
  **OQ-18**; clients must not rely on it until PR-37 documents one. Empty list is
  `200 { "contacts": [] }`.

#### `POST /api/contacts` ▢ Defined

Add a user as a contact. Immediate and symmetric.

- **Auth:** session cookie required.
- **Body:** `{ "userId": string }` — the **other user's `User.id`**, never a
  `Contact` row id.
- **Success:** `201 Created` when the relationship is new, `200 OK` when it
  already existed; both return `{ "contact": { "user": { "id", "displayName" } } }`.
- **Errors:** `400 SELF_CONTACT`, `400 VALIDATION_FAILED`,
  `404 USER_NOT_FOUND`, `401 AUTH_REQUIRED`
- **Notes:** adding an existing contact is a no-op, and the response does not
  reveal whether this call created it beyond the status code. `404
  USER_NOT_FOUND` discloses that a user id does not exist — see OQ-11.

#### `DELETE /api/contacts/:id` ▢ Defined

Remove a contact relationship.

- **Auth:** session cookie required.
- **Path parameter:** `:id` — the **other user's `User.id`**, never a `Contact`
  row id.
- **Success — `204 No Content`:** idempotent. Removing a non-contact, or the same
  contact twice, still returns `204`.
- **Errors:** `400 SELF_CONTACT`, `401 AUTH_REQUIRED`
- **Notes:** removing is symmetric — the relationship disappears for both users.
  **What happens to an existing conversation between the pair is undecided**
  (OQ-4). This contract does not delete, hide, or freeze anything; the messaging
  PRs must settle it before this endpoint ships.

### Conversations (PR-51 – PR-54)

Every conversation has exactly two participants, stored as a canonical ordered
pair (ADR-0020). There is no group conversation and no conversation type.

`Conversation` = `{ id, participants: [UserSummary, UserSummary], createdAt}`,
where `UserSummary` = `{ id, displayName }`. Participant array order carries **no
meaning** and must not be used to identify the caller's peer by position; compare
ids.

#### `GET /api/conversations` ▢ Defined

List the caller's conversations.

- **Auth:** session cookie required.
- **Parameters:** none in v1. There is no pagination on this endpoint.
- **Success — `200 OK`:** `{ "conversations": [Conversation] }`
- **Errors:** `401 AUTH_REQUIRED`
- **Notes:** no last-message preview and no `lastMessageAt` in v1. Ordering is
  **undecided** (OQ-7) and must be documented by PR-53 before clients depend on
  it. Empty list is `200 { "conversations": [] }`.

#### `POST /api/conversations` ▢ Defined

Get or create the single conversation for a pair.

- **Auth:** session cookie required.
- **Body:** `{ "userId": string }` — the peer's `User.id`. The client never sends
  the pair or a conversation id.
- **Success:** `201 Created` when a conversation was created, `200 OK` when it
  already existed; both return `{ "conversation": Conversation }`.
- **Errors:** `400 SELF_CONVERSATION`, `400 VALIDATION_FAILED`,
  `403 NOT_CONTACTS`, `404 USER_NOT_FOUND`, `401 AUTH_REQUIRED`
- **Notes:**
  - A conversation requires a **mutual contact** (ADR-0020, ADR-0021). An
    existing user who is not a contact is `403 NOT_CONTACTS`; an id that matches
    no user is `404 USER_NOT_FOUND`. That difference deliberately discloses user
    existence (OQ-10, resolved).
  - **Concurrency:** the server derives the ordered pair itself —
    `(min(callerId, peerId), max(callerId, peerId))` — and inserts against the
    pair's unique constraint (`upsert`, retrying on `P2002` and re-reading). Two
    simultaneous requests must yield one row, one `201`, and one `200`. An
    implementation that reads-then-writes without the constraint is non-conforming.
  - The endpoint is idempotent by pair, not by request: repeated calls never
    create a second conversation.

#### `GET /api/conversations/:id` ▢ Defined

Fetch one conversation.

- **Auth:** session cookie required; caller must be one of the two participants.
- **Success — `200 OK`:** `{ "conversation": Conversation }`
- **Errors:** `404 CONVERSATION_NOT_FOUND`, `401 AUTH_REQUIRED`
- **Notes:** **non-participants receive `404`, not `403`**, with the same body as
  a missing id, so the endpoint cannot be used to confirm that a conversation
  exists. Membership is checked server-side on every request.

### Messages (PR-55 – PR-59)

`Message` = `{ id, conversationId, senderId, body, createdAt }`. `body` is the
wire field name; the current Prisma sketch calls the column `content`, and PR-15
may align the two. This contract fixes only the JSON name.

#### `GET /api/conversations/:id/messages` ▢ Defined

Read message history, newest first.

- **Auth:** session cookie required; participant only.
- **Query:** `cursor` (opaque, optional), `limit` (optional, default `50`,
  maximum `100`).
- **Success — `200 OK`:**

```json
{
  "messages": [
    { "id": "clx0msg9", "conversationId": "clx0conv1", "senderId": "clx0user2", "body": "See you at the square", "createdAt": "2026-11-14T10:05:00.000Z" }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTExLTE0VDEwOjA1OjAwLjAwMFoiLCJpZCI6ImNseDBtc2c5In0"
}
```

- **Errors:** `400 INVALID_CURSOR`, `400 INVALID_LIMIT`, `404
  CONVERSATION_NOT_FOUND`, `401 AUTH_REQUIRED`
- **Notes:** fetching the newest page sends **no** `cursor`. A malformed cursor is
  `400 INVALID_CURSOR` — never a silent restart from the top. Non-participants get
  `404`, identical to an unknown conversation. The full rules are in
  [Pagination](#pagination).

#### `POST /api/conversations/:id/messages` ▢ Defined

Send a message.

- **Auth:** session cookie required; participant only. The sender is the caller —
  a `senderId` in the body is ignored and must be rejected as an unknown field.
- **Body:** `{ "body": string }`
- **Success — `201 Created`:** `{ "message": Message }`
- **Errors:** `400 VALIDATION_FAILED`, `404 CONVERSATION_NOT_FOUND`,
  `401 AUTH_REQUIRED`
- **Notes:** content length limits and empty/whitespace rules are validation
  mechanics owned by PR-12. **Send is not idempotent in v1** (OQ-9): a retried
  request creates a second message, and clients must not auto-retry blindly. A
  message is returned with its stored `createdAt`; there is no delivery state,
  read receipt, edit, or delete in v1 (OQ-12).

---

## Pagination

One rule set for message history.

| Aspect | Contract |
| --- | --- |
| Direction | Newest first: `ORDER BY createdAt DESC, id DESC`. |
| Parameter | `cursor` only. There is no `before`, `after`, `page`, or `offset`. |
| Cursor | Opaque `base64url` of `(createdAt, id)`. Clients must treat it as a token, never parse or construct it. |
| Page query | `WHERE (createdAt, id) < (cursor.createdAt, cursor.id)`. |
| Page size | `limit` default `50`, maximum `100`; a larger value is rejected, not clamped. |
| Invalid input | Non-integer or out-of-range `limit` → `400 INVALID_LIMIT`; undecodable cursor → `400 INVALID_CURSOR`. |
| End | `nextCursor` is `null` when the page is the last one; `messages` may be shorter than `limit`. |
| Empty | No messages → `200 { "messages": [], "nextCursor": null }`. |
| Stability | Keyset ordering means new messages arriving at the top do not shift a page already being read; do not switch to offset pagination. |

The supporting index `(conversationId, createdAt DESC, id DESC)` is a **PR-16**
requirement. This contract states the read pattern; it does not design indexes.

---

## Error format

**The status codes and error codes below are part of this contract. The JSON
envelope itself is owned by PR-12 and is not decided here.**

PR-12 fixes the body shape, field names, validation details, and the
error-handling middleware. Until it lands, clients must not assume a body shape —
only the status code and the stable code string. No response may contain a stack
trace, an absolute file path, SQL, or other internal detail (the default Express
handler currently does exactly that for malformed JSON).

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_FAILED` | `400` | A field is missing, malformed, unknown, or out of range. |
| `INVALID_LIMIT` | `400` | `limit` is not an integer within 1–100. |
| `INVALID_CURSOR` | `400` | The cursor cannot be decoded. |
| `SELF_CONTACT` | `400` | A contact operation targets the caller. |
| `SELF_CONVERSATION` | `400` | Conversation creation targets the caller. |
| `AUTH_REQUIRED` | `401` | No session, or an invalid/expired one. |
| `INVALID_CREDENTIALS` | `401` | Login email/password do not match. |
| `NOT_CONTACTS` | `403` | Conversation creation with a user who is not a mutual contact. |
| `USER_NOT_FOUND` | `404` | No user with that id. Discloses user existence by design. |
| `CONVERSATION_NOT_FOUND` | `404` | No such conversation **or** caller is not a participant — deliberately indistinguishable. |
| `EMAIL_TAKEN` | `409` | Signup with an already-registered email. |
| `RATE_LIMITED` | `429` | Reserved; rate limiting is PR-27 and not implemented. |
| `INTERNAL` | `500` | Reserved for unexpected failures; no details in the body. |

`GET /api/health` has no error responses. `POST /api/auth/logout` has none either
— it always succeeds.

---

## Other planned endpoints

These are **not** part of the PR-11 contract and remain unshaped.

### `GET /api/dwellings` ▢ Pending

Dwelling data for the world. **Undecided:** whether dwelling positions come from
the server at all, or live in frontend map data
([`../design/maps.md`](../design/maps.md)). The mock world identifies contacts by
map-local ids such as `contact-elowen`; mapping those to `User.id` is **OQ-15**.

### `GET /api/maps` ▢ Pending

Map definitions. **Undecided:** maps may never become server data.

### `GET /api/altars` ▢ Planned — Phase 12

Altar identity and membership (FR-026, FR-027). Group conversations belong to an
Altar and arrive in Phase 12 of [`../../plan.md`](../../plan.md).

**Do not invent event names in code before they are designed and documented
here.** An undocumented event is an integration bug waiting to happen. HTTP
message creation may later emit an event; the HTTP contract above does not
promise one.

---

## Open questions

Contract-level questions deliberately left open. Each names the PR that must
resolve it; none is answered by this document.

| ID | Question | Resolve by |
| --- | --- | --- |
| OQ-1 | Must `displayName` be unique, and is it required at signup? | PR-23 |
| OQ-2 | Password policy (length, normalization) and email normalization/case-folding | PR-12, PR-23 |
| OQ-4 | **What happens to an existing conversation when a contact is removed** (keep, read-only, hide, delete) — explicitly unresolved | PR-39, PR-51 |
| OQ-5 | Is `POST /api/conversations` the only creation path, or does sending the first message create one implicitly? | PR-52 |
| OQ-6 | Does the conversation list ever include a last-message preview, and is its text private? | PR-53 |
| OQ-7 | Conversation-list ordering and tie-breaker; no sort key is promised in v1 | PR-53 |
| OQ-8 | Can conversations be deleted or archived? No endpoint is defined | PR-54 |
| OQ-9 | Send-message idempotency and safe client retry semantics | PR-56 |
| OQ-11 | `404 USER_NOT_FOUND` on contact add discloses whether a user id exists — accepted for v1 | PR-38 |
| OQ-12 | Message edit/delete, read receipts, delivery states, unread counts — all out of v1 | PR-59 |
| OQ-13 | CSRF token mechanism (double-submit cookie vs. header) — deferred, not denied | PR-27 |
| OQ-14 | Deployment topology: same-site (Lax viable) or split-origin (needs `SameSite=None; Secure` plus a CSRF token) | PR-27, launch |
| OQ-15 | Mapping frontend map/contact ids to server `User.id` for dwellings and world rendering | PR-76, PR-15 |
| OQ-16 | Socket.IO handshake authentication reusing this cookie, including origin checks | PR-60 |
| OQ-17 | Rate-limit responses (`429 RATE_LIMITED`, `Retry-After`) are unbuilt | PR-27 |
| OQ-18 | Contact-list ordering | PR-37 |

**Resolved during review:** OQ-10 (non-contact vs. unknown user) — existing
non-contact is `403 NOT_CONTACTS`, unknown user is `404 USER_NOT_FOUND`, and the
disclosure is documented.

---

## How to change this contract

1. A contract change is a documentation PR: edit this file first, and record a
   hard-to-reverse choice as an ADR in
   [`../planning/decisions.md`](../planning/decisions.md).
2. **Do not implement an endpoint whose definition is missing or marked Pending.**
3. When implementing one, in the **same change**:
   - move it from *Defined* to *Implemented*;
   - state how to verify it (a `curl` command or a UI action);
   - state the authorization rule actually enforced;
   - if it caches anything, give the key, TTL, and invalidation trigger
     ([`../architecture/security-and-caching.md`](../architecture/security-and-caching.md));
   - if it emits or consumes a socket event, document the event here too.
4. Keep the [Error format](#error-format) codes in sync with PR-12's envelope.

---

## Related

- [`../architecture/backend.md`](../architecture/backend.md) — backend layering
- [`../architecture/realtime.md`](../architecture/realtime.md) — realtime design
- [`../architecture/security-and-caching.md`](../architecture/security-and-caching.md) — cookie, CSRF, authorization, validation
- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0020, ADR-0021, ADR-0022
