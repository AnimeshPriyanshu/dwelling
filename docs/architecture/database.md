# Database

The conceptual data model for Dwelling.

> **Status: approved; schema and initial migration committed.** The model below was
> approved on 2026-11-13, including **Option A** for Phase 12. The five-model schema
> is in `database/prisma/schema.prisma` with one migration,
> `20261113220000_initial_migration`. No application code reads or writes it yet —
> there is no query in the repository — so the schema can still change as later PRs
> land.
>
> Sections below that refer to "the sketch" and to a pending schema revision are the
> pre-migration design record: the revision they describe is the committed
> five-model schema.

---

## What actually exists

```text
database/
├── package.json              ✅  scripts: generate (prisma generate), migrate (prisma migrate dev)
├── prisma/schema.prisma      ✅  generator + datasource(PostgreSQL) + 5 models
└── prisma/migrations/        ✅  20261113220000_initial_migration
```

- **Provider:** PostgreSQL, URL from the `DATABASE_URL` environment variable.
- **Migrations:** one — `20261113220000_initial_migration` creates the five-model
  schema. `prisma migrate status` reports the local database up to date; there is
  no seed script.
- **Generated client:** `backend/src/db/prisma.js` instantiates `PrismaClient`,
  but **no query is executed anywhere** in the repository yet.

**Consequence:** the data layer is ready for the auth and messaging routes; those
routes are still to be written.

---

## Existing models

The committed schema defines five models:

| Model | Fields | Represents |
| --- | --- | --- |
| `User` | `id`, `email` (unique), `passwordHash`, `displayName`, `createdAt` | A person using Dwelling |
| `Dwelling` | `id`, `title` (default `"Home"`), `ownerId` (unique) | A user's place in the world |
| `Contact` | `userId`, `contactId`, `createdAt`, composite primary key | A contact edge between two users (ADR-0021) |
| `Conversation` | `id`, `createdAt`, `userOneId`, `userTwoId` | A private conversation between exactly two contacts (ADR-0020) |
| `Message` | `id`, `content`, `createdAt`, `conversationId`, `senderId` | A single message |

This is the target five-model set (ADR-0020, ADR-0021). The legacy
`ConversationMember`, `Altar` and `AltarMembership` tables were dropped at
PR-15/PR-16; Phase 12 reintroduces Altar support in a redesigned shape.

Notable design points already expressed in the schema:

- `Dwelling.ownerId` is **`@unique`** and the relation `User.dwelling` is
  **optional** — encoding "one dwelling per contact" (matching the glossary and
  [`../design/game-world.md`](../design/game-world.md)).
- `Contact` uses a **composite primary key** (`@@id([userId, contactId])`) plus an
  index on `contactId`, so duplicate edges are impossible and "who added me" is a
  cheap lookup.
- `Message` has `@@index([conversationId, createdAt])`, which matches the
  "load a conversation in time order" read pattern.
- Deletes **cascade** from `User` to `Dwelling`/`Contact` and from `Conversation`
  to `Message`; a user who owns a conversation or sent a message is `Restrict`ed.
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

**Committed:** `Contact` is part of the schema, one row per direction
(`userId` → `contactId`), so a mutual add writes both rows. The exact row shape
can still change.

**API representation:** the contacts endpoints identify a contact by the
**peer's `User.id`**, never by a `Contact` row id. `POST /api/contacts` takes
`{ userId }` and `DELETE /api/contacts/:id` takes that same peer id, so the API
never exposes a contact row, so the row shape stays an implementation detail
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

**Implemented in the schema:** the pair is stored directly as `userOneId` and
`userTwoId`, canonically ordered (`userOneId` < `userTwoId`) so a pair always
resolves to the same row, with a unique constraint on the pair, an index on
`userTwoId`, and the hand-written `Conversation_canonical_pair` check in the
initial migration that enforces the ordering. `ConversationMember` — arbitrary
membership — is gone (ADR-0020).

### Message

Content, author, and the conversation it belongs to. Timestamp plus index
supports ordered reads.

**Undecided:** message content format (plain text vs. rich), maximum length,
edit/delete semantics, and read receipts. None are designed.

### Altar and AltarMembership

**Out of scope** (ADR-0020). An Altar is scenery in the world — a visible landmark
positioned by map data — with no interaction, no membership and no conversation.
The legacy `Altar` and `AltarMembership` tables were removed at PR-15/PR-16 and
are not part of the current data model; Phase 12 adds redesigned Altar tables
with their own migration.

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
were dropped at PR-15/PR-16 and are recreated here with a conversation link.
Nothing was migrated: the initial migration creates only the five-model schema
(`User`, `Dwelling`, `Contact`, `Conversation`, `Message`) and no legacy rows
existed. `ConversationMember` is reintroduced for groups only; direct messages
never use it. `Altar` stores identity and membership only — world position stays
in frontend map data.

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

## Approved Demo Dataset

The following dataset is validated by the Prisma schema, ADR-0021, and the
approved Contact model (`@@id([userId, contactId])` composite primary key). It
is deterministic, idempotent, and safe for seed script implementation (PR-17).

### Entity counts
- **7 users**, 7 dwellings, **12 Contact rows** (6 mutual Alex-resident
  relationships × 2 mirrored rows), **6 conversations**, **18 messages**.

### Demo users and dwellings
| User | Dwelling |
| --- | --- |
| Alex | Alex's Home |
| Elowen | Redwood Cottage |
| Rowan | Cobalt Haven |
| Kael | Amber Hearth |
| Lyra | Verdant Rest |
| Sable | Sunhollow Cottage |
| Tomas | Tidewood Lodge |

### Deterministic ID lists (approved, exact)
- **Users**: `demo-alex`, `demo-elowen`, `demo-rowan`, `demo-kael`, `demo-lyra`, `demo-sable`, `demo-tomas`
- **Dwellings**: `demo-alex-home`, `demo-elowen-cottage`, `demo-rowan-haven`, `demo-kael-hearth`, `demo-lyra-rest`, `demo-sable-cottage`, `demo-tomas-lodge`
- **Conversations**: `demo-alex-elowen`, `demo-alex-rowan`, `demo-alex-kael`, `demo-alex-lyra`, `demo-alex-sable`, `demo-alex-tomas`
- **Messages**: `demo-alex-{resident}-{1|2|3}` pattern per the 6 conversations; Contact identity is the composite primary key `[userId, contactId]` — no separate Contact IDs invented.

### Exact 18-message dataset (base date `2024-01-15`, deterministic UTC ISO 8601 timestamps with `Z` suffix, seconds `00`)
| Conv ID | Msg ID | Sender | Content | UTC Timestamp | Display Order |
| --- | --- | --- | --- | --- | --- |
| demo-alex-elowen | demo-alex-elowen-1 | inbound | Welcome to Redwood Cottage! Pull up a chair by the hearth. | `2024-01-15T10:42:00Z` | 1 |
| demo-alex-elowen | demo-alex-elowen-2 | outbound | Thanks! The herbs outside smell wonderful. | `2024-01-15T10:43:00Z` | 2 |
| demo-alex-elowen | demo-alex-elowen-3 | inbound | That would be the wild lavender. Take some if you need it! | `2024-01-15T10:45:00Z` | 3 |
| demo-alex-rowan | demo-alex-rowan-1 | inbound | Greetings! Mind the woodchips on the doorstep. | `2024-01-15T11:15:00Z` | 1 |
| demo-alex-rowan | demo-alex-rowan-2 | outbound | Working on a new project? | `2024-01-15T11:16:00Z` | 2 |
| demo-alex-rowan | demo-alex-rowan-3 | inbound | Carving cedar benches for the town square. Stop by anytime! | `2024-01-15T11:18:00Z` | 3 |
| demo-alex-kael | demo-alex-kael-1 | inbound | The forge is glowing bright today! Keep your distance from the anvil. | `2024-01-15T13:20:00Z` | 1 |
| demo-alex-kael | demo-alex-kael-2 | outbound | Do you have any reinforced nails for fence repairs? | `2024-01-15T13:22:00Z` | 2 |
| demo-alex-kael | demo-alex-kael-3 | inbound | Plenty in the barrel out back. Take what you need. | `2024-01-15T13:24:00Z` | 3 |
| demo-alex-lyra | demo-alex-lyra-1 | inbound | Welcome traveler! Come warm your hands by the stove. | `2024-01-15T14:05:00Z` | 1 |
| demo-alex-lyra | demo-alex-lyra-2 | outbound | Do you have hot spiced cider ready? | `2024-01-15T14:07:00Z` | 2 |
| demo-alex-lyra | demo-alex-lyra-3 | inbound | A fresh kettle is simmering right now. Have a seat! | `2024-01-15T14:08:00Z` | 3 |
| demo-alex-sable | demo-alex-sable-1 | inbound | Welcome to Sunhollow! Mind the tide charts on the table. | `2024-01-15T09:10:00Z` | 1 |
| demo-alex-sable | demo-alex-sable-2 | outbound | Did you chart the southern shoals yet? | `2024-01-15T09:12:00Z` | 2 |
| demo-alex-sable | demo-alex-sable-3 | inbound | Only the near side. The far side needs a calm morning. | `2024-01-15T09:14:00Z` | 3 |
| demo-alex-tomas | demo-alex-tomas-1 | inbound | The tide is turning — the nets are already out. | `2024-01-15T06:40:00Z` | 1 |
| demo-alex-tomas | demo-alex-tomas-2 | outbound | Any luck with the silver catch? | `2024-01-15T06:42:00Z` | 2 |
| demo-alex-tomas | demo-alex-tomas-3 | inbound | Two baskets full. Come by the lodge and I will show you. | `2024-01-15T06:44:00Z` | 3 |

### Contact model
- Uses `@@id([userId, contactId])` composite primary key, not `@@unique([userId, contactId])`.
- Two mirrored rows per mutual relationship: `(userId=A, contactId=B)` and
  `(userId=B, contactId=A)`.
- No resident-to-resident contacts outside the approved 6 Alex-resident pairs.
- Mutual add: writing both rows in one transaction.
- Mutual removal: deleting both rows in one transaction.
- CHECK constraint `userId <> contactId`; service also rejects self-add before
  touching the database.

### Conversations
- **6 one-to-one conversations**, all involving Alex as one participant:
  - Alex ↔ Elowen
  - Alex ↔ Rowan
  - Alex ↔ Kael
  - Alex ↔ Lyra
  - Alex ↔ Sable
  - Alex ↔ Tomas
- Canonical ordering: `userOneId < userTwoId` (application-normalized).
- Unique constraint: `@@unique([userOneId, userTwoId])` enforced in migration.
- Both relations use `onDelete: Restrict`; conversation history must not disappear
  because one account is removed (account removal is a soft delete).

### Messages
- **18 messages total**: exactly 3 messages per conversation, in display order.
- Message content, sender direction, and display order come from
  `frontend/src/App.jsx` under `RESIDENT_MESSAGES`.
- Fixed synthetic UTC ISO 8601 timestamps from base date `2024-01-15` with
  seconds `00` and suffix `Z` (e.g. `2024-01-15T00:00:00Z`).
- No arbitrary or variable timestamps; all 18 timestamps are deterministic.

### Password and authentication
- Shared demo password read from `DEMO_PASSWORD` in local `.env.local`
  (placeholder `DEMO_PASSWORD=placeholder-only-never-commit` in
  `.env.example`).
- Dependency order: **PR-19** (install bcryptjs) → **PR-20** (shared `hash()`
  and `compare()` implementation) → **PR-17** (seed script using shared
  implementation). PR-17 depends on both PR-19 and PR-20; bcryptjs alone is
  insufficient.
- For an existing seeded user's password: use `compare(DEMO_PASSWORD, existing.passwordHash)` — never compare raw bcrypt hash strings because salts differ. If verification fails, abort; never overwrite the existing hash.
- Seed execution must be explicit CLI execution, never application startup.
- Abort when `NODE_ENV=production`. Do not expose the demo password in logs or errors.
- The actual `DEMO_PASSWORD` belongs only in a local ignored environment file.
- No production seeding or automatic deployment seeding.

### Idempotency and collision safety
- **Preflight both User ID and email**: if an ID exists with the wrong email, or an email exists with the wrong ID, abort. If both resolve to different records, abort.
- **Verify existing records against all expected data**: never silently adopt or overwrite unrelated records.
- **Use actual schema unique constraints for each entity** as final protection against concurrent races.
- **All preflight checks, existing-record verification, and writes occur inside one Prisma interactive transaction callback using the transaction-scoped `tx` client**. Do not use the global Prisma client for operations inside the transaction.
- **Database constraints remain the final concurrency protection** against races.
- **A correctly seeded rerun verifies and no-ops**: any mismatch or error rolls back the complete transaction.
- **Never reset, truncate, or drop the database** during seeding.
- Use deterministic IDs and actual schema unique constraints as the foundation.

### Environment and execution safety
- Seed execution must be explicit CLI execution, never application startup.
- Abort when `NODE_ENV=production`.
- Do not expose the demo password in logs or errors.
- The actual `DEMO_PASSWORD` belongs only in a local ignored environment file.
- No production seeding or automatic deployment seeding.
