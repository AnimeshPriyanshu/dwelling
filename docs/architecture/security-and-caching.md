# Security and Caching

Responsibilities, rules, and what must never be committed.

> **None of these controls are implemented.** There is no authentication, no
> authorization, no input validation, no rate limiting, and no functional
> caching. This document records the *intent* so the requirements are not
> forgotten — not so they are built now. Authentication is the exception in one
> sense only: its **contract** is decided (ADR-0022) so the API can be defined;
> the code still does not exist. See
> [`../project/scope.md`](../project/scope.md).

---

## Security posture today

Dwelling currently runs as a **single-user local development app**:

- The only endpoint, `GET /api/health`, returns a constant and touches no data.
- Socket connections are unauthenticated; a connecting client is sent
  `server:ready` and nothing else.
- There is no session, cookie, token, or user identity anywhere in the codebase.
  The contract for when there is one is in [Authentication](#authentication-decided-not-implemented)
  and [`../api/README.md`](../api/README.md).
- CORS is limited to `CLIENT_ORIGIN` (default `http://localhost:5173`) for
  Socket.IO. **Express has no CORS configuration**, because no browser code calls
  the API yet.
- There is no error-handling middleware, so an unhandled error would fall through
  to Express's default handler.

**Consequence:** the app is safe *because* it is inert. As soon as real data flows,
the gaps below become real vulnerabilities. See Stage 6 in
[`../planning/roadmap.md`](../planning/roadmap.md).

---

## Authentication (decided, not implemented)

**Decided in ADR-0022**
([`../planning/decisions.md`](../planning/decisions.md#adr-0022--jwt-authentication-using-an-httponly-cookie)).
**No authentication code exists yet** — not the dependencies (PR-19), not the
helpers (PR-21), not the middleware (PR-22).

**HTTP:** a signed JWT (`HS256`, `JWT_SECRET`) delivered in an `HttpOnly` cookie
named `dwelling_session`. It is set at signup and login, sent automatically on
every same-origin API request, and verified before any user-specific handler
runs.

| Cookie attribute | Value |
| --- | --- |
| `HttpOnly` | Yes — JavaScript cannot read it |
| `SameSite` | `Lax` |
| `Secure` | Yes when `NODE_ENV=production`, otherwise omitted for local HTTP |
| `Path` | `/` |
| `Max-Age` | Seven days, matching the JWT `exp` |

- **Lifetime:** seven days, fixed at issue. No refresh token, no sliding session.
- **Logout:** clears the cookie and always returns `204`. It does **not** revoke
  the token. An already-issued JWT — including a copied one — remains valid until
  `exp`; a denylist, token-version check, or password-change invalidation is not
  built in v1 and needs its own decision.
- **Socket:** the socket connection must be authenticated **at connection time**,
  not on each event, and an unauthenticated socket must not be placed in any
  room. Reusing `dwelling_session` for the handshake is PR-60; origin checking
  there is not yet specified (OQ-16).
- **Identity:** always comes from the verified cookie. A `userId`, `senderId`, or
  role in a request body or event payload is a claim, not a proof.
- **Client:** the token is never exposed to JavaScript, never stored in
  `localStorage`/`sessionStorage`, and never returned in a response body.

### CSRF

Cookie authentication is automatically attached by the browser, so state-changing
requests need CSRF defenses that a bearer header would not.

- **Required now:** `Content-Type: application/json` on every state-changing
  request (HTML forms cannot send it), and an `Origin`/`Referer` check against
  `CLIENT_ORIGIN` for requests that rely on the session cookie. Both are enforced
  at the transport boundary (PR-27).
- **`SameSite=Lax`** blocks cross-site form POSTs and subrequests, but it is a
  layer, not the whole answer: same-site subdomains, XSS on the app's own origin,
  and clients that ignore the attribute are not covered.
- **No CSRF token in v1** — deferred, not denied (OQ-13).
- **Cross-site deployment breaks the `Lax` assumption:** if the frontend and API
  are on different sites, the cookie must become `SameSite=None; Secure`, which
  removes the main built-in protection and makes a CSRF token mandatory. The
  deployment topology is OQ-14 and must be settled before launch; the posture is
  reassessed at PR-27.

---

## Authorization (not implemented)

**Intended:** every read and write is checked against the caller's identity.

The rules to enforce, derived from the data model (ADR-0020, ADR-0021,
[`database.md`](database.md)):

| Action | Rule |
| --- | --- |
| Create a conversation | Caller must be one of the pair, and the other participant must be a mutual contact. Existing non-contact → `403 NOT_CONTACTS`; unknown user id → `404 USER_NOT_FOUND` (documented disclosure) |
| Read a conversation's messages | Caller must be one of its **two** participants |
| Send a message | Caller must be one of its two participants **and** be the sender |
| Read a dwelling | Dwelling ownership is public by design (it is a place in the world), but the linked conversation is not |
| Move a player | Depends on the movement-authority decision in [`realtime.md`](realtime.md) |

**No group or Altar rule:** there is no group conversation and no Altar
membership to authorize (ADR-0020).

**Critical rule:** authorization is enforced **server-side on every request and
event**. Hiding a button in the UI is not access control. The frontend may only
decide what to *show*, never what is *allowed*.

**Non-participants get `404`.** Reading or writing a conversation the caller is
not part of returns `404 CONVERSATION_NOT_FOUND`, with the same body as an
unknown id, so the API does not confirm that a conversation exists. `403` is
reserved for a caller who is known but not allowed to perform the specific
operation — today only conversation creation against a non-contact.

**Common failure to avoid:** resolving a resource by client-supplied id without
checking membership. `GET /conversations/:id/messages` must verify the caller is a
participant of *that* conversation — not merely that the conversation exists.

---

## Input validation (not implemented)

**Intended:** validate at the transport boundary, before domain logic.

- **Rule:** validate **every** inbound value — request bodies, query parameters,
  route parameters, and socket event payloads.
- **Rule:** reject unknown/extra fields rather than silently ignoring them.
- **Rule:** enforce explicit limits — maximum string lengths, array sizes,
  pagination bounds. Message pagination is fixed at a default of 50 and a maximum
  of 100 (see [`../api/README.md`](../api/README.md#pagination)); message content
  has no length limit in the schema today.
- **Rule:** treat all client input as untrusted strings. Do not assume a value is
  a valid id because it is named one.
- **Why boundary validation:** domain modules can then assume well-formed input
  and stay free of transport concerns
  ([`backend.md`](backend.md)).
- **Mechanics owned by PR-12:** the validation approach (hand-written checks vs.
  a small schema library), the error envelope, and field-level rules. Any library
  must be added deliberately, not silently. This document does not prescribe one.

**Note:** a value being stored by Prisma does not make it safe. Prisma prevents
SQL injection, not invalid or hostile content.

---

## Rate limiting (not implemented)

**Intended:** bound how much work one client can cause.

| Surface | Risk | Intended limit |
| --- | --- | --- |
| HTTP endpoints generally | Brute force, scraping | Per-IP and per-user request limits |
| Message sending | Spam, flooding | Per-user rate limit on send events |
| Socket connections | Connection flooding | Limit concurrent connections per user/IP |
| Movement events | Tick flooding (higher rate than anything else) | Drop excess ticks server-side rather than queueing them |

- **Rule:** rate limits are enforced on the **server**; a client-side throttle is
  a UX nicety, not a control.
- **Where it belongs:** as middleware before handlers, or in the domain module
  guarding the specific operation. **Undecided** which, until there is more than
  one endpoint.
- **Storage:** counters are a natural fit for Redis, which is already available
  behind `backend/src/cache/` — see below.
- **Status:** not implemented. The API contract reserves the `429 RATE_LIMITED`
  code, but no limit, window, or `Retry-After` header is defined yet (PR-27).

---

## Secure configuration (partially in place)

**Already correct:**

- `.env` is gitignored; `.env.example` documents keys with placeholder values
  only.
- The backend loads configuration from a single module
  (`backend/src/config/env.js`).
- CORS for sockets is restricted to a configured origin rather than `*`.

**Rules going forward:**

- All secrets come from environment variables, read through `config/env.js`.
- **Never** give a secret a default value in code. A missing required secret
  should fail fast at startup, not silently fall back to a development value.
  (`PORT` and `CLIENT_ORIGIN` defaults are fine — they are not secrets.)
- Validate configuration at startup and refuse to boot with an invalid setup.
- Do not log secrets, tokens, or full request bodies containing credentials.
- Frontend environment variables (`VITE_*`) are **bundled into the client and are
  therefore public**. Never put a secret in one.

---

## What must never be committed

| Never commit | Why |
| --- | --- |
| `.env` or any real credentials | Contains live secrets (NFR-011) |
| Database connection strings with credentials | `DATABASE_URL` grants full database access |
| API keys, tokens, private keys, certificates | Immediate compromise |
| Redis URLs with passwords | Grants cache access |
| Dumps of real user data | Privacy; also usually contains credentials |
| Screenshots showing a terminal with secrets or an open `.env` | Commonly leaked by accident |
| Third-party assets without a redistributable license | Legal, not just hygiene — see [`../design/assets.md`](../design/assets.md) |

**Rule of practice:** if a secret is ever committed, **rotate it**. Deleting the
commit is not sufficient — assume it was copied.

`.gitignore` already covers `node_modules`, `.env`, and build output. Verify that
any new secret-bearing file is ignored **before** creating it.

---

## Caching (not implemented)

**What exists:** `backend/src/cache/` provides `connectCache`, `getCache`,
`setCache(key, value, ttlSeconds = 60)`, and `closeCache`, all no-ops when
`REDIS_URL` is unset. Nothing calls `getCache`/`setCache`, and `closeCache` is
never called (see [`backend.md`](backend.md)).

**Intended responsibility boundary — the important part:**

Caching is a **backend responsibility**. Correctness must never depend on the
frontend's cache.

- **Rule:** Redis stays behind `backend/src/cache/`. Feature code must not import
  the Redis client or construct keys in an ad-hoc way — this is already stated in
  `backend/src/cache/README.md` and restated here as binding.
- **Rule:** the cache is an optimization, never the source of truth. Any cached
  value must be reconstructible from the database. Losing the cache must degrade
  performance, not correctness.
- **Rule:** **never cache authorization results in a way that outlives the
  session** — a stale permission cache is a privilege-escalation bug.
- **Rule:** every cached entry needs an explicit TTL. The default of 60 seconds is
  a starting point, not a policy.
- **Rule:** because Redis is optional in local development, code must work
  correctly with the cache disabled. `setCache`/`getCache` no-op behavior already
  supports this — keep it that way.

**Candidate caches (later, not now):**

| Data | Cacheable? | Note |
| --- | --- | --- |
| Contact/participant lists | Yes, short TTL | Invalidation on membership change |
| Message history pages | Yes, careful | Messages are appended constantly; a stale page is user-visible |
| Presence | No | Already ephemeral by design |
| Rate-limit counters | Yes | Natural fit for Redis |
| A user's own permissions | Only within a request | See the rule above |

**Explicitly out of scope:** HTTP caching headers, CDN configuration, service
workers, and client-side caching. None are designed.

---

## Client-side considerations

- **Never** store credentials or session tokens in `localStorage` or
  `sessionStorage` — either is readable by any script on the page.
- **Decided:** the session lives only in the `HttpOnly` `dwelling_session` cookie
  and is not readable by frontend code. There is no token-storage decision left
  for the client (ADR-0022).
- The frontend must not depend on a hidden DOM element or an unrendered panel for
  security. Anything the browser has received is visible to the user.
- Any `VITE_*` value is public; treat it as published.

---

## Summary: what to do when a real feature is built

1. Identify the resource and the caller's relationship to it.
2. Enforce authorization **server-side**, resolving the caller from the session —
   never from the payload.
3. Validate every input value and its limits at the transport boundary.
4. Decide whether the operation needs a rate limit.
5. If caching, define the key, the TTL, and the invalidation trigger — and verify
   correctness with the cache disabled.
6. Record the decision if it is hard to reverse.

## Related

- [`backend.md`](backend.md) — where these controls belong
- [`realtime.md`](realtime.md) — socket authentication and event validation
- [`database.md`](database.md) — the entities authorization is defined over
- [`../development/setup.md`](../development/setup.md) — environment configuration
- [`../planning/roadmap.md`](../planning/roadmap.md) — Stage 6
