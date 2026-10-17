# Security and Caching

Responsibilities, rules, and what must never be committed.

> **Nothing in this document is implemented.** There is no authentication, no
> authorization, no input validation, no rate limiting, and no functional
> caching. This document records the *intent* so the requirements are not
> forgotten — not so they are built now. See
> [`../project/scope.md`](../project/scope.md).

---

## Security posture today

Dwelling currently runs as a **single-user local development app**:

- The only endpoint, `GET /api/health`, returns a constant and touches no data.
- Socket connections are unauthenticated; a connecting client is sent
  `server:ready` and nothing else.
- There is no session, cookie, token, or user identity anywhere in the codebase.
- CORS is limited to `CLIENT_ORIGIN` (default `http://localhost:5173`) for
  Socket.IO. **Express has no CORS configuration**, because no browser code calls
  the API yet.
- There is no error-handling middleware, so an unhandled error would fall through
  to Express's default handler.

**Consequence:** the app is safe *because* it is inert. As soon as real data flows,
the gaps below become real vulnerabilities. See Stage 6 in
[`../planning/roadmap.md`](../planning/roadmap.md).

---

## Authentication (not implemented)

**Intended:** prove who a user is on both HTTP and socket connections.

- **HTTP:** a session or token established at sign-in, sent with every request,
  verified before any user-specific handler runs.
- **Socket:** the socket connection must be authenticated **at connection time**,
  not on each event. An unauthenticated socket must not be placed in any room.
- **Requirement:** identity comes from the server-side session, **never** from a
  `userId` in the request body or event payload. A client-supplied id is a
  claim, not a proof.
- **Undecided:** session cookies vs. tokens, and the sign-up/sign-in flow itself.
  Both are product decisions that have not been made.

---

## Authorization (not implemented)

**Intended:** every read and write is checked against the caller's identity.

The rules to enforce, derived from the existing schema
([`database.md`](database.md)):

| Action | Rule |
| --- | --- |
| Read a conversation's messages | Caller must be a `ConversationMember` |
| Send a message | Caller must be a `ConversationMember` **and** be the sender |
| Read a dwelling | Dwelling ownership is public by design (it is a place in the world), but the linked conversation is not |
| Join an Altar | Membership rules are **undecided** |
| Move a player | Depends on the movement-authority decision in [`realtime.md`](realtime.md) |

**Critical rule:** authorization is enforced **server-side on every request and
event**. Hiding a button in the UI is not access control. The frontend may only
decide what to *show*, never what is *allowed*.

**Common failure to avoid:** resolving a resource by client-supplied id without
checking membership. `GET /conversations/:id/messages` must verify the caller is a
member of *that* conversation — not merely that the conversation exists.

---

## Input validation (not implemented)

**Intended:** validate at the transport boundary, before domain logic.

- **Rule:** validate **every** inbound value — request bodies, query parameters,
  route parameters, and socket event payloads.
- **Rule:** reject unknown/extra fields rather than silently ignoring them.
- **Rule:** enforce explicit limits — maximum string lengths, array sizes,
  pagination bounds. `Message.content` has no length limit in the schema today.
- **Rule:** treat all client input as untrusted strings. Do not assume a value is
  a valid id because it is named one.
- **Why boundary validation:** domain modules can then assume well-formed input
  and stay free of transport concerns
  ([`backend.md`](backend.md)).
- **Undecided:** the validation approach (hand-written checks vs. a small schema
  library). Any library must be added deliberately, not silently.

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

- **Never** store credentials in `localStorage` or `sessionStorage` without a
  deliberate decision — either is readable by any script on the page.
- The frontend must not depend on a hidden DOM element or an unrendered panel for
  security. Anything the browser has received is visible to the user.
- Any `VITE_*` value is public; treat it as published.
- **Undecided:** the sign-in flow and token storage approach. Decide together with
  authentication.

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
