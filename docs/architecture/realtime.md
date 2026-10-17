# Realtime

The intended realtime architecture, and how its concerns should stay separated.

> **Nothing here is implemented beyond a single handshake event.** Every
> behavioral section below is a plan, not a description of the code. Do not
> document or build against these event names as if they exist.

---

## What exists today

| Piece | Server | Client |
| --- | --- | --- |
| Socket.IO | `socket.io` in `backend/src/server.js`, CORS origin = `env.clientOrigin` | `socket.io-client` is a **declared dependency but never imported** |
| Handlers | `backend/src/sockets/index.js`: on `connection` → `socket.emit('server:ready')` | No listener exists |
| Namespaces/rooms | none | none |
| Auth on connect | none | none |
| Proxy | shared HTTP server on port `3000`, path `/socket.io` | `frontend/vite.config.js` proxies `/socket.io` with `ws: true` |

**The only realtime event name in the codebase is `server:ready`.** There is no
message delivery, no presence, no movement sync, and no group interaction.

---

## The four realtime concerns

Dwelling has four distinct realtime needs. They have different reliability,
latency, and ordering requirements, and **splitting them is the core design rule
of this document.**

```text
┌─────────────────────────────────────────────────────────────┐
│                        Socket.IO                            │
├───────────────┬───────────────┬──────────────┬──────────────┤
│   MESSAGING   │   PRESENCE    │   MOVEMENT   │    GROUP     │
│               │               │              │              │
│ durable       │ ephemeral     │ ephemeral,   │ durable      │
│ ordered       │ last-write    │ high rate    │ state +      │
│ must persist  │ wins          │ lossy ok     │ presence     │
│               │               │              │              │
│  ↳ rooms per  │  ↳ broadcast  │  ↳ ticks,    │  ↳ Altars    │
│    conversation│   online set │    not saves │              │
└───────────────┴───────────────┴──────────────┴──────────────┘
```

| Concern | Durability | Frequency | Ordering | Phase |
| --- | --- | --- | --- | --- |
| **Messaging** | Must persist (database) | Low | Strict, per conversation | Stage 4 |
| **Presence** | Ephemeral | Low | Not important | Stage 5 |
| **Movement** | Never persisted | High (per tick) | Interpolation, lossy is fine | Stage 5 |
| **Group (Altars)** | Membership persists; activity is ephemeral | Medium | Medium | Stage 5 |

**Rule:** these must not share transport code paths. A movement tick must never
be able to delay, duplicate, or corrupt a message. Concretely, this means
separate event namespaces, separate handler modules, and separate client
services — even though all four ride the same Socket.IO connection.

---

## Messaging (planned)

- **Delivered as:** Socket.IO events, with the database as the source of truth.
- **Shape:** client emits a send event → server validates membership, persists the
  message, then broadcasts to the conversation's room.
- **Why a room per conversation:** rooms give fan-out to exactly the members
  without the server tracking sockets per user by hand, and they map directly onto
  `ConversationMember`.
- **Ordering:** the **database timestamp is authoritative**, not the client's or
  the arrival order of socket events. Clients render by the stored `createdAt`,
  which the existing `Message` index `[conversationId, createdAt]` already
  supports ([`database.md`](database.md)).
- **Delivery guarantee:** at-least-once. Clients must tolerate a duplicate message
  id rather than assuming exactly-once delivery.
- **Undecided:** client-side ack semantics, optimistic rendering, retry on
  disconnect, and history pagination.

**Pending:** all of it. No messaging event exists.

---

## Presence (planned)

- **Delivered as:** ephemeral broadcasts of online/offline changes.
- **Why ephemeral:** presence is a *fact about right now*, not a record. Persisting
  it creates stale state that must be reconciled.
- **Requirement:** the frontend must treat presence as **best-effort**. A contact
  shown as offline might be online; the UI must not present presence as certain.
- **Undecided:** whether presence is broadcast to all users or only to contacts
  (relevant because "contacts" is not modeled yet — see
  [`database.md`](database.md)).
- **Undecided:** idle/away states, and how a stale connection is detected.

**Pending:** nothing is implemented. FR-029 is deferred.

---

## Player movement (planned)

- **Delivered as:** high-frequency position updates, explicitly **never
  persisted**.
- **Why separate from messaging:** a movement tick firing many times per second has
  nothing in common with a durable message. Mixing them means one slow consumer
  affects both.
- **Undecided — the biggest open question:** whether movement is
  - **authoritative-server** (server simulates and corrects clients — correct,
    more work), or
  - **client-authoritative presence** (each client reports its position, others
    interpolate — simple, exploitable, fine for a college project).

  This must be decided before any code is written, because it changes the client
  architecture. When decided, record it as an ADR.
- **Proposed:** interpolation on the receiving side, so rendering is smooth even
  when updates arrive irregularly.
- **Requirement:** clients must not send movement data that the server trusts for
  anything consequential while movement remains client-authoritative.

**Pending:** nothing is implemented. Today the player does not even move yet — see
[`../design/game-world.md`](../design/game-world.md).

---

## Group interaction / Altars (planned)

- **Delivered as:** a mix of durable membership and ephemeral activity.
- **What persists:** who belongs to an Altar (`AltarMembership` in the schema).
- **What does not:** who is standing in it right now — that is presence.
- **Why grouped rather than a separate transport:** an Altar is a room with
  multiple users, so it composes established messaging + presence rather than
  inventing a fourth protocol.
- **Undecided:** whether an Altar always owns a conversation, and how a user
  entering an Altar joins it.

**Pending:** deferred product feature (FR-026, FR-027).

---

## Transport rules

For any realtime work added later:

1. **Socket handlers stay in `backend/src/sockets/`.** `backend/src/sockets/README.md`
   states event handlers belong there, separate from HTTP routes and domain logic.
2. **Handlers do not hold business logic.** They parse input, call a domain
   module, and emit results — mirroring the rule in [`backend.md`](backend.md).
3. **Event names are namespaced by concern**, so an event's owner is obvious from
   its name and different concerns cannot collide.
4. **Payloads are small, plain, JSON-serializable data.** No class instances, no
   dates as objects, no binary blobs.
5. **Every event must be documented in [`../api/README.md`](../api/README.md)
   once it exists** — an undocumented event is a bug waiting to happen.
6. **Validate every inbound payload.** Never treat a client-sent id as proof of
   membership — see [`security-and-caching.md`](security-and-caching.md).
7. **The client keeps transport in a service module** (`src/services/`), never
   inside a Phaser scene or a DOM module
   ([`frontend.md`](frontend.md)).

---

## Why nothing was implemented early

Designing the message wire format before the interaction that triggers it exists
would be guessing. The frontend phase establishes *what a conversation even is* in
this product — which dwelling opens which panel — and the realtime contract
follows from that.

## Open questions

| Question | Status |
| --- | --- |
| Movement authority (server vs. client) | Undecided — decide before coding |
| Presence audience (all users vs. contacts) | Undecided — blocked on contact modeling |
| Delivery/ack semantics for messages | Undecided |
| Message history pagination | Undecided |
| How entering an Altar joins its room | Undecided |
| Authenticating socket connections | Deferred to Stage 6 |

## Related

- [`backend.md`](backend.md) — backend boundaries
- [`database.md`](database.md) — persistence the realtime layer depends on
- [`security-and-caching.md`](security-and-caching.md) — socket auth and validation
- [`../api/README.md`](../api/README.md) — where events get documented
- [`../planning/roadmap.md`](../planning/roadmap.md) — Stages 4 and 5
