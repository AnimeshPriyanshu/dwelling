# Database

The conceptual data model for Dwelling.

> **Status: approved, not implemented.** The model below was approved on
> 2026-11-13, including **Option A** for Phase 12. The Prisma schema in
> `database/prisma/schema.prisma` is still the original seven-model sketch: it has
> **never been migrated**, there is no `database/prisma/migrations/` directory, and
> no application code reads or writes it. **No schema file or migration has been
> changed yet.**
>
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

**API representation:** the contacts endpoints identify a contact by the
**peer's `User.id`**, never by a `Contact` row id. `POST /api/contacts` takes
`{ userId }` and `DELETE /api/contacts/:id` takes that same peer id, so the API
never exposes a contact row and the row shape stays free for the schema revision
([`../api/README.md`](../api/README.md#contacts-pr-36--pr-42)).

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

## Target for direct messages (Phases 0–11): five models

| Model | Fields | Represents |
| --- | --- | --- |
| `User` | `id`, `displayName`, `createdAt` (+ `email`, `passwordHash` from Phase 3) | A person using Dwelling |
| `Dwelling` | `id`, `title` (default `"Home"`), `ownerId` (unique) | A user's place in the world |
| `Contact` | `userId`, `contactId`, `createdAt` | One entry in one user's contact list |
| `Conversation` | `id`, `createdAt`, `userOneId`, `userTwoId` | A one-to-one conversation |
| `Message` | `id`, `content`, `createdAt`, `conversationId`, `senderId` | A single message |

Legacy `ConversationMember`, `Altar`, and `AltarMembership` are dropped by the
first migration (PR-15/PR-16). Altars are **deferred, not removed from the
product**: Phase 12 reintroduces them in a redesigned shape
([`plan.md`](../planning/plan.md), "Phase 12").

### `Contact` — two mirrored rows

- One row per direction: `(userId = A, contactId = B)` and
  `(userId = B, contactId = A)`.
- `@@unique([userId, contactId])`, implemented as the composite primary key
  `@@id([userId, contactId])`: same guarantee, no surrogate `id` column. Say so if
  you prefer a surrogate `id` plus `@@unique` instead.
- `@@index([contactId])` so the reverse lookup is cheap (approved).
- CHECK constraint `userId <> contactId`; the service also rejects self-add
  before touching the database.
- **Mutual add:** creating a contact writes both rows in one transaction.
- **Mutual removal:** deleting a contact deletes both rows in one transaction.
  This is the intended mutual-contact behaviour: a contact list is not one-way,
  and a half-deleted pair would leave one user seeing a dwelling they can no
  longer converse with.
- The service is the only writer. A future reconciliation job could repair a
  half-deleted pair, but with a single writer and a transaction it should never
  occur.

Trade-off recorded: mirrored rows double the storage and require transactional
writes, but "my contacts" becomes a single indexed read with no ordering logic,
and the unique index makes duplicates impossible.

### `Conversation` — canonical pair

- `userOneId`, `userTwoId` are the only participants (direct messages).
- `@@unique([userOneId, userTwoId])` and `@@index([userTwoId])` (the unique index
  already covers lookups by `userOneId`).
- Both relations use `onDelete: Restrict`. Conversation history must not disappear
  because one account is removed; account removal is a soft delete (below).
- **Ordering:** application code normalises the pair to `userOneId < userTwoId`
  on every create and every lookup.
- **Database enforcement:** the migration adds `CHECK ("userOneId" < "userTwoId")`.
  A `<>` check alone is insufficient — `(A,B)` and `(B,A)` would both pass a
  `<>` check and could coexist as two "different" conversations with the same
  two people.
- Lookup between A and B is therefore a single equality on the normalised pair,
  not an `OR` over both orders.

### `Message` — sender authorization

- `content`, `createdAt`, `conversationId`, `senderId`.
- `@@index([conversationId, createdAt])` for ordered pagination.
- `conversation` cascades (deleting a conversation removes its messages); `sender`
  uses `onDelete: Restrict` so retained history always has an author row.
- **The sender must be one of the conversation's two participants.** This is
  enforced in the backend service that writes the message, in the same
  transaction as the insert, and covered by tests (non-participant send is
  rejected, not silently accepted).
- **Why no database constraint:** a CHECK cannot reference another table in
  PostgreSQL, and a composite foreign key would need a referenced unique key
  containing `(conversationId, senderId)` — that only exists if participants are
  rows (a membership table). Direct conversations store them as columns, so the
  only ways to get a database guarantee are a trigger or reintroducing the join
  table the five-model design removes. Both are more complexity than the risk
  justifies: there is exactly one write path, it is authorized before insert, and
  tests cover it.
- **Phase 12 note:** group conversations will have `ConversationMember` rows, so
  a composite FK `(conversationId, senderId)` becomes cheap for group messages.
  That is an optional hardening, not a requirement.

### `Dwelling`

Unchanged from the sketch: `ownerId` unique, cascade on user delete. Its world
position stays frontend map data, not a database column.

---

## Phase 12 extension: Altars and group conversations

An Altar is a shared place with persistent membership; its group conversation is
the Altar's thread. Two shapes were considered; **Option A is approved (ADR-0021)**.

**Option A — one conversation model with a kind. Approved 2026-11-13.**

- One `Conversation` and one `Message` model serve both direct and Altar
  conversations; there is no second message table.
- `Conversation` gains `kind` (`DIRECT` | `ALTAR`), nullable `userOneId` /
  `userTwoId`, and nullable `altarId`.
- `ConversationMember` returns for `ALTAR` conversations only.
- CHECK constraints keep the shapes honest: `DIRECT` requires both pair
  columns, no `altarId`, and `userOneId < userTwoId`; `ALTAR` requires `altarId`
  and no pair columns. "Two or more members" is enforced by the service, because
  a CHECK cannot count rows.
- `altarId` is `@unique` (nullable; PostgreSQL allows many `NULL`s), so each Altar
  has at most one group conversation.
- Direct-pair uniqueness becomes a **partial** unique index on
  `(userOneId, userTwoId) WHERE kind = 'DIRECT'` (hand-written SQL; Prisma cannot
  express partial indexes).
- `Altar` (`id`, `name`, `createdAt`) and `AltarMembership`
  (`altarId`, `userId`, `joinedAt`, `@@unique([altarId, userId])`,
  `@@index([userId])`).
- **Only current Altar members may read or send messages**, and membership is
  checked on the backend for every read and every write — not only when joining.
- One message table, one pagination contract, one conversation list.

**Option B — a separate group-conversation model.**

- Keep `Conversation` untouched; add `AltarConversation` with its own membership
  and message storage.
- Stronger compile-time 1:1 typing, but duplicates message storage, pagination,
  realtime delivery, and conversation-list code.

**Implications of the change from today:** the legacy `Altar`/`AltarMembership`
are dropped at PR-16 and recreated here with a conversation link. Nothing is
migrated because no database exists yet; if one exists by then, PR-16's drop must
be cancelled or the rows exported first. `ConversationMember` is reintroduced for
groups only; direct messages never use it. `Altar` stores identity and membership
only — world position stays in frontend map data.

### Phase 12 schema sketch (not applied)

```prisma
enum ConversationKind {
  DIRECT
  ALTAR
}

model Altar {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  conversation Conversation?
  memberships  AltarMembership[]
}

model AltarMembership {
  altarId  String
  userId   String
  joinedAt DateTime @default(now())

  altar Altar @relation(fields: [altarId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([altarId, userId])
  @@index([userId])
}

model Conversation {
  id        String           @id @default(cuid())
  kind      ConversationKind
  createdAt DateTime         @default(now())
  altarId   String?          @unique
  userOneId String?
  userTwoId String?

  altar   Altar? @relation(fields: [altarId], references: [id], onDelete: Restrict)
  userOne User?  @relation("ConversationUserOne", fields: [userOneId], references: [id], onDelete: Restrict)
  userTwo User?  @relation("ConversationUserTwo", fields: [userTwoId], references: [id], onDelete: Restrict)

  members  ConversationMember[]
  messages Message[]

  @@index([userTwoId])
}

model ConversationMember {
  conversationId String
  userId         String
  joinedAt       DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([conversationId, userId])
}
```

`Message` is unchanged in Phase 12. Note that the direct `@@unique([userOneId,
userTwoId])` disappears from the Prisma model because it becomes a **partial**
unique index that Prisma cannot express; the migration adds it.

### How Phase 12 preserves existing direct conversations and messages

1. `Conversation.kind` is added with a constant default `'DIRECT'`, then set
   `NOT NULL`. In PostgreSQL 11+ a constant default is a metadata-only change, so
   existing rows are backfilled without a rewrite.
2. `userOneId` / `userTwoId` become nullable, but existing direct rows keep their
   values, so those conversations stay readable and writable before and after.
3. `altarId` is added nullable. Every existing row keeps `NULL`, which satisfies
   the `DIRECT` branch of the shape CHECK.
4. The old `@@unique([userOneId, userTwoId])` is dropped in the same transaction
   and replaced by the partial unique index `WHERE kind = 'DIRECT'`. That is the
   only destructive-looking step, and it preserves the exact same guarantee for
   direct pairs while allowing many `NULL`s for Altar conversations.
5. `Message` is not touched: no column changes, no table copy, no backfill. The
   same `conversationId` values now point at conversations that happen to have a
   `kind`, so history and pagination are unchanged.
6. New tables (`Altar`, `AltarMembership`, `ConversationMember`) are created empty;
   no existing row is moved.

Rollback is the mirror image (drop the new tables, drop `kind`/`altarId`, restore
`NOT NULL` on the pair, restore the plain unique constraint) — safe because no
direct row ever loses its pair.

---

## Proposed schema for Phases 0–11 (not written to `schema.prisma`)

Approved shape. `email` and `passwordHash` stay required: the deletion policy will
overwrite them with anonymised values rather than null them, so uniqueness and
NOT NULL remain simple. `deletedAt` is deliberately **not** in this proposal — it
arrives with the retention implementation, after the UI proposal is approved.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  displayName  String
  createdAt    DateTime @default(now())

  dwelling           Dwelling?
  contacts           Contact[]      @relation("ContactOwner")
  addedBy            Contact[]      @relation("ContactTarget")
  messages           Message[]
  conversationsAsOne Conversation[] @relation("ConversationUserOne")
  conversationsAsTwo Conversation[] @relation("ConversationUserTwo")
}

model Dwelling {
  id      String @id @default(cuid())
  title   String @default("Home")
  ownerId String @unique

  owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)
}

model Contact {
  userId    String
  contactId String
  createdAt DateTime @default(now())

  user    User @relation("ContactOwner", fields: [userId], references: [id], onDelete: Cascade)
  contact User @relation("ContactTarget", fields: [contactId], references: [id], onDelete: Cascade)

  @@id([userId, contactId])
  @@index([contactId])

  @@unique([userId, contactId])
  @@index([contactId])
}

model Conversation {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  userOneId String
  userTwoId String

  userOne  User      @relation("ConversationUserOne", fields: [userOneId], references: [id], onDelete: Restrict)
  userTwo  User      @relation("ConversationUserTwo", fields: [userTwoId], references: [id], onDelete: Restrict)

  messages Message[]

  @@unique([userOneId, userTwoId])
  @@index([userTwoId])
}

model Message {
  id             String   @id @default(cuid())
  content        String
  createdAt      DateTime @default(now())
  conversationId String
  senderId       String

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation(fields: [senderId], references: [id], onDelete: Restrict)

  @@index([conversationId, createdAt])
}
```

## PostgreSQL objects Prisma cannot express

| Object | Why Prisma cannot express it | How the migration handles it |
| --- | --- | --- |
| `CHECK ("userId" <> "contactId")` on `Contact` | Prisma schema has no CHECK syntax and does not introspect checks | Appended by hand to the generated `migration.sql` |
| `CHECK ("userOneId" < "userTwoId")` on `Conversation` | Same | Appended by hand |
| Canonical ordering semantics | The DB compares `text`; the app must compare the same way | App compares cuid strings with `<` (lower-case ASCII), never `localeCompare`, so both agree. Switching to UUIDs keeps byte order but needs an app review |
| Phase 12 `CHECK` for the `DIRECT`/`ALTAR` shape | Same | Appended by hand in the Phase 12 migration |
| Phase 12 partial unique index on `(userOneId, userTwoId) WHERE kind = 'DIRECT'` | Prisma models neither partial nor filtered indexes; `db pull` reports it as unsupported | `CREATE UNIQUE INDEX ... WHERE ...` in the migration SQL. Prisma does not model it, so **review every later migration** and re-add it if a generated diff tries to drop it |
| "An Altar conversation has two or more members" | A CHECK cannot count rows | Service-layer validation, plus tests |
| Case-insensitive email uniqueness (only if ever needed) | Needs a functional index or `citext` | Not needed: the service lowercases email before insert; revisit as a migration if that changes |

Workflow for every schema change: `prisma migrate dev --create-only`, edit the SQL
for the objects above, review it, then apply. Migrations are the source of truth;
`migrations/` is never rewritten after it has been applied. A regression test
should query `pg_constraint` / `pg_indexes` so a hand-written guarantee cannot
silently disappear.

## PR-16 table operations (approved, not executed)

| Operation | Objects |
| --- | --- |
| **CREATE** | `User`, `Dwelling`, `Contact`, `Conversation`, `Message` (with the PKs, unique constraints, indexes, and FKs from the schema above) |
| **DROP** | `ConversationMember`, `Altar`, `AltarMembership` |
| **ALTER** | None. There is no migration history, so the first migration creates the five tables in their final shape |
| Prisma metadata | `_prisma_migrations` is created by `prisma migrate dev` |
| Not in PR-16 | Altar tables (Phase 12), `deletedAt` (retention implementation), any seed data |

PR-16 adds these hand-written constraints after the generated `CREATE TABLE`s:
`Contact_no_self`, `Conversation_canonical_pair`.

**Destructive-drop guard:** before the three `DROP`s, count rows in the legacy
tables. If any contain data, stop and ask the owner; do not reset the database and
do not drop data. If a local database already has the seven-model sketch (for
example via `prisma db push`), `migrate dev` will require a baseline or a reset —
that decision needs explicit owner approval and a dump first.

---

## Access pattern

- **Confirmed:** only the backend reaches the database. The frontend talks to the
  API; it never connects to PostgreSQL.
- **Confirmed:** Prisma access stays in `backend/src/db/` and domain modules, not
  in transport handlers — see [`backend.md`](../backend.md).
- **No connection pooling, retry, or timeout configuration** exists; the default
  `PrismaClient` is used as-is.

---

## Open questions

| Question | Status |
| --- | --- |
| How contacts are modeled | **Decided** — two mirrored rows, mutual add/remove |
| Whether conversations have an explicit type | **Decided for Phase 12** — `kind` discriminator |
| How a direct conversation is resolved between two users | **Decided** — canonical pair, `userOneId < userTwoId` |
| How Altars relate to conversations | **Approved** — one group conversation per Altar (`altarId` unique); members only, enforced on the backend |
| Whether dwelling positions are stored server-side | Undecided |
| Message content format and limits | Undecided |
| User-deletion retention policy | Approved in principle; UI proposal awaiting review; not implemented |

---

## Rules for changing the schema

1. **Do not change `schema.prisma` without owner approval** of the model shape.
2. Change the sketch and this document in the same PR.
3. Generate a migration in the same change — an unmigrated schema is a lie.
4. Hand-written SQL is expected for CHECK constraints, partial unique indexes, and
   the canonical-ordering guarantee; document it next to the model.
5. Record a hard-to-reverse choice (contact modeling, Altar conversation shape,
   retention policy) as an ADR in [`../planning/decisions.md`](../planning/decisions.md).

---

## Related

- [`plan.md`](../planning/plan.md) — the roadmap, including Phase 12
- [`backend.md`](../backend.md) — how the backend reaches the database
- [`../design/maps.md`](../design/maps.md) — where dwelling placement currently lives
- [`../development/setup.md`](../development/setup.md) — `DATABASE_URL` and Prisma commands
- [`../project/glossary.md`](../project/glossary.md) — Contact, Dwelling, Altar
