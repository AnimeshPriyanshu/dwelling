# Database

The conceptual data model for Dwelling.

> **This is not a finalized schema.** A Prisma schema already exists in
> `database/prisma/schema.prisma` as a starting point, but it has **never been
> migrated** and no application code reads or writes it. Treat it as a sketch
> that will change, not a contract.

---

## What actually exists

```text
database/
├── package.json              ✅  scripts: generate (prisma generate), migrate (prisma migrate dev)
└── prisma/schema.prisma      ✅  generator + datasource(PostgreSQL) + 7 models
```

- **Provider:** PostgreSQL, URL from the `DATABASE_URL` environment variable.
- **Migrations:** **none generated.** No `database/prisma/migrations/` directory
  exists, so there is no migration history for the current schema.
- **Tables:** none in any live database. `npm run db:migrate` has not been run.
- **Generated client:** `backend/src/db/prisma.js` instantiates `PrismaClient`,
  but **no query is executed anywhere** in the repository.

**Consequence:** the messaging phase cannot begin until a first migration exists
and the client is generated.

---

## Existing models (as sketched)

The current schema defines seven models:

| Model | Fields (as sketched) | Represents |
| --- | --- | --- |
| `User` | `id`, `displayName`, `createdAt` | A person using Dwelling |
| `Dwelling` | `id`, `title` (default `"Home"`), `ownerId` (unique) | A user's place in the world |
| `Conversation` | `id`, `createdAt` | A private conversation between exactly two contacts (ADR-0020) |
| `ConversationMember` | `conversationId`, `userId`, `joinedAt` | Membership join table — **not the target** (ADR-0020) |
| `Message` | `id`, `content`, `createdAt`, `conversationId`, `senderId` | A single message |
| `Altar` | `id`, `name` | Out of scope — scenery only, removed in the target model (ADR-0020) |
| `AltarMembership` | `altarId`, `userId`, `joinedAt` | Out of scope — removed in the target model (ADR-0020) |

**Target model set:** five models — `User`, `Dwelling`, `Contact`, `Conversation`,
`Message` (ADR-0020, ADR-0021). The sketch still contains seven until the schema
revision; note that `Contact` does not exist yet.

Notable design points already expressed in the schema:

- `Dwelling.ownerId` is **`@unique`** and the relation `User.dwelling` is
  **optional** — encoding "one dwelling per contact" (matching the glossary and
  [`../design/game-world.md`](../design/game-world.md)).
- `ConversationMember` and `AltarMembership` use **composite primary keys**
  (`@@id([conversationId, userId])`), so duplicates are impossible. Both models
  are **not the target**: a conversation is a canonical pair and Altars are
  removed (ADR-0020).
- `Message` has `@@index([conversationId, createdAt])`, which matches the
  "load a conversation in time order" read pattern.
- Deletes **cascade** from `User`, `Conversation`, and `Altar`.
- `id` values default to `cuid()`.

---

## Conceptual entities

Described independently of the sketch, because the schema will change:

### User
A person. Has a display name and an identity used to route conversations.

### Contact
A **mutual relationship between two users**, stored as data (ADR-0021). A contact
is symmetric: if A has B as a contact then B has A as a contact. Adding is
immediate — there is no pending request or accept state — and adding yourself is
rejected. "My contacts" is a query over that relationship, not a view of every
user.

**Decided, not yet in the sketch:** the current schema has no contacts table. A
`Contact` model is part of the target five-model set and arrives with the schema
revision; the exact row shape (one canonical pair row versus mirrored rows) is a
schema detail.

Contacts are what make a conversation legal: creating one requires **both**
participants to be mutual contacts (ADR-0020, ADR-0021).

### Dwelling
A user's place in the world: a title plus the owning user. A dwelling's world
position is **not stored in the database**: map data pairs a position with a
contact id, and the contact resolves to the user and therefore to their dwelling.

**Undecided:** should dwelling position be server-side data (shared by all users)
or frontend data (per build)? This decides whether moving a house is a data change
or a deploy.

### Conversation
A **private conversation between exactly two contacts** (ADR-0020). Group
conversations are not supported, so there is no conversation type to
distinguish: a single kind of conversation exists and a `type` field is **not
needed**.

**Decided, not yet in the sketch:** the target model stores the pair directly as
`userOneId` and `userTwoId`, canonically ordered (`userOneId` < `userTwoId`) so a
pair always resolves to the same row, with a uniqueness constraint on the pair,
an index on `userTwoId`, and a database check that the two ids differ. The current
sketch's `ConversationMember` — arbitrary membership — is **not** the target and
is removed with the schema revision.

### Message
Content, author, and the conversation it belongs to. Timestamp plus index
supports ordered reads.

**Undecided:** message content format (plain text vs. rich), maximum length,
edit/delete semantics, and read receipts. None are designed.

### Altar and AltarMembership
**Out of scope** (ADR-0020). An Altar is scenery in the world — a visible landmark
positioned by map data — with no interaction, no membership and no conversation.
The sketch's `Altar` and `AltarMembership` models are removed with the schema
revision and are not part of the target data model.

### Map
**Not in the schema.** Maps are currently frontend data
([`../design/maps.md`](../design/maps.md)). Whether maps ever become server data
is **undecided**.

---

## Relationships

```text
User ────1:1──▶ Dwelling            (Dwelling.ownerId is unique; a user may have none)
User ────N:M──▶ User                 (as contacts: mutual, one relationship per pair)
User ────1:N──▶ Conversation         (as userOne or userTwo — exactly two participants)
User ────1:N──▶ Message              (as sender)
Conversation ─1:N─▶ Message
```

- **No relationship exists between a contact and a map.** Map placement is derived
  from the contact's name at the frontend layer
  ([`../design/maps.md`](../design/maps.md)).
- **No relationship exists between a dwelling and a conversation.** Opening a
  conversation from a dwelling means resolving the contact first. **Decided:** the
  canonical ordered pair identifies the conversation, so it is resolved by a pair
  lookup and created on first use (ADR-0020).

---

## Access pattern

- **Confirmed:** only the backend may reach the database. The frontend talks to
  the API; it never connects to PostgreSQL.
- **Confirmed:** Prisma access stays in `backend/src/db/` (and domain modules),
  not in transport handlers — see [`backend.md`](backend.md).
- **No connection pooling, retry, or timeout configuration** exists; the default
  `PrismaClient` is used as-is.

---

## Open questions

| Question | Status |
| --- | --- |
| How contacts are modeled (friends vs. all users) | Resolved: mutual add, no request/accept state (ADR-0021) |
| Whether dwelling positions are stored server-side | Undecided |
| Whether conversations have an explicit type | Resolved: not needed — one-to-one only (ADR-0020) |
| How a direct conversation is resolved between two users | Resolved: canonical ordered pair (ADR-0020) |
| What happens to a conversation when a contact is removed | Undecided — decide before implementing removal |
| Message content format and limits | Undecided |
| How Altars relate to conversations | Out of scope (ADR-0020) |
| Whether maps become server data | Undecided |
| When the first migration is generated | Deferred — messaging phase |

## Rules for changing the schema

1. **Do not change the schema during the frontend phase.** It is not on the
   critical path ([`../project/scope.md`](../project/scope.md)).
2. When it changes, update the sketch and this document together.
3. Generate a migration in the same change — an unmigrated schema is a lie.
4. Record a hard-to-reverse choice (like contact modeling) as an ADR in
   [`../planning/decisions.md`](../planning/decisions.md).
5. **Do not introduce a group or Altar model.** Conversations have exactly two
   participants and Altars are scenery only (ADR-0020).

## Related

- [`backend.md`](backend.md) — how the backend reaches the database
- [`../design/maps.md`](../design/maps.md) — where dwelling placement currently lives
- [`../development/setup.md`](../development/setup.md) — `DATABASE_URL` and Prisma commands
- [`../project/glossary.md`](../project/glossary.md) — Contact, Dwelling, Altar
