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
| `Conversation` | `id`, `createdAt` | A conversation, one-to-one or group |
| `ConversationMember` | `conversationId`, `userId`, `joinedAt` | Membership join table |
| `Message` | `id`, `content`, `createdAt`, `conversationId`, `senderId` | A single message |
| `Altar` | `id`, `name` | A shared gathering location |
| `AltarMembership` | `altarId`, `userId`, `joinedAt` | Membership join table |

Notable design points already expressed in the schema:

- `Dwelling.ownerId` is **`@unique`** and the relation `User.dwelling` is
  **optional** — encoding "one dwelling per contact" (matching the glossary and
  [`../design/game-world.md`](../design/game-world.md)).
- `ConversationMember` and `AltarMembership` use **composite primary keys**
  (`@@id([conversationId, userId])`), so duplicates are impossible.
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
A **relationship, not a stored entity** in the current sketch: a contact is
another user as seen from the perspective of the current user. The schema has no
friendship/contacts table yet, so "my contacts" is not modeled.

**Undecided:** whether contacts are bidirectional friendships, one-way follows, or
simply "every other user". This is the biggest open question in the data model
and it directly affects which dwellings appear in a player's world.

### Dwelling
A user's place in the world: a title plus the owning user. A dwelling's world
position is **not stored in the database**: map data pairs a position with a
contact id, and the contact resolves to the user and therefore to their dwelling.

**Undecided:** should dwelling position be server-side data (shared by all users)
or frontend data (per build)? This decides whether moving a house is a data change
or a deploy.

### Conversation and ConversationMember
A conversation plus its participants. Membership is explicit, so group
conversations (Altars) and direct conversations use the same shape — the
distinction is currently **implicit**, based on member count.

**Undecided:** whether to distinguish conversation types explicitly with a
`type` field. Adding it later is easy; guessing wrong now is not.

### Message
Content, author, and the conversation it belongs to. Timestamp plus index
supports ordered reads.

**Undecided:** message content format (plain text vs. rich), maximum length,
edit/delete semantics, and read receipts. None are designed.

### Altar and AltarMembership
A named shared space with members. Conceptually distinct from a dwelling because
**many users occupy one Altar at a time**.

**Undecided:** whether an Altar references a conversation directly, or whether
the conversation is derived from its membership, and whether Altars always have
a conversation at all.

### Map
**Not in the schema.** Maps are currently frontend data
([`../design/maps.md`](../design/maps.md)). Whether maps ever become server data
is **undecided**.

---

## Relationships

```text
User ────1:1──▶ Dwelling            (Dwelling.ownerId is unique; a user may have none)
User ────N:M──▶ Conversation         (via ConversationMember)
User ────1:N──▶ Message              (as sender)
Conversation ─1:N─▶ Message
User ────N:M──▶ Altar                (via AltarMembership)
```

- **No relationship exists between a contact and a map.** Map placement is derived
  from the contact's name at the frontend layer
  ([`../design/maps.md`](../design/maps.md)).
- **No relationship exists between a dwelling and a conversation.** Opening a
  conversation from a dwelling means resolving the contact first. **Undecided:**
  whether direct conversations are created lazily on first interaction, and how a
  canonical direct conversation between two users is found.

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
| How contacts are modeled (friends vs. all users) | Undecided |
| Whether dwelling positions are stored server-side | Undecided |
| Whether conversations have an explicit type | Undecided |
| How a direct conversation is resolved between two users | Undecided |
| Message content format and limits | Undecided |
| How Altars relate to conversations | Undecided |
| Whether maps become server data | Undecided |
| When the first migration is generated | Deferred — messaging phase |

## Rules for changing the schema

1. **Do not change the schema during the frontend phase.** It is not on the
   critical path ([`../project/scope.md`](../project/scope.md)).
2. When it changes, update the sketch and this document together.
3. Generate a migration in the same change — an unmigrated schema is a lie.
4. Record a hard-to-reverse choice (like contact modeling) as an ADR in
   [`../planning/decisions.md`](../planning/decisions.md).

## Related

- [`backend.md`](backend.md) — how the backend reaches the database
- [`../design/maps.md`](../design/maps.md) — where dwelling placement currently lives
- [`../development/setup.md`](../development/setup.md) — `DATABASE_URL` and Prisma commands
- [`../project/glossary.md`](../project/glossary.md) — Contact, Dwelling, Altar
