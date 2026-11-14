# Dwelling Implementation Plan

Status: **approved roadmap, in progress.** Phases 0 and 1 are complete
(PR-02…PR-09, verified 2026-11-13); Phase 2 is next. The original 84-PR record
below is preserved as written, with completion marks added. Altars and group
conversations are scheduled as **Phase 12** (PR-85…PR-92) and are not part of the
direct-message phases.

Scope: 84 reviewable PRs across 12 phases for direct messages, plus a later
8-PR phase for Altars and group conversations.

Work locally. Do not commit, push, or open PRs unless explicitly requested.

## Product Scope

Dwelling is a 2D social chat website. The roadmap delivers **one-to-one
conversations** first, then **group conversations inside Altars**.

In scope:

- Email/password authentication.
- Mutual contact adding without a request/accept flow.
- One-to-one conversations between contacts.
- Persisted message history with pagination.
- Realtime message delivery, typing indicators, and presence.
- Contact dwellings rendered dynamically in the existing Phaser world.
- Opening a real conversation by interacting with a contact's dwelling.
- **Altar membership and Altar-based group conversations (Phase 12).**

Out of scope for the direct-message phases (0–11):

- Group chat and group membership — delivered by Phase 12.
- Altar-based conversations and Altar membership — delivered by Phase 12.
- Request/accept contact workflows — not planned.
- Perfect alphabet-aware map authoring.

Altars remain part of the product vision: **a group conversation always belongs
to an Altar**, and the Altar is the only place more than two people share a
conversation (ADR-0015).

## Approved Architecture Decisions

| Area | Decision |
| --- | --- |
| Frontend | React, JavaScript, Vite, Phaser 3 |
| Backend | Node.js, Express, Socket.IO |
| Data | Prisma, PostgreSQL on Supabase |
| Auth | Email/password, `bcryptjs`, JWT in an httpOnly cookie, `cookie-parser` |
| Socket auth | Reuse the same auth cookie |
| Contacts | Immediate mutual add; two mirrored rows (`@@unique([userId, contactId])`, no self-contact) |
| Conversations (direct) | Exactly two participants, stored as `userOneId` and `userTwoId` |
| Conversation ordering | Canonical `userOneId < userTwoId`, enforced in application code **and** by a database CHECK constraint |
| Altars (Phase 12) | Group conversations belong to an Altar; membership is explicit and persists |
| World | Render contact dwellings dynamically; defer full map re-authoring |
| Tests | Vitest, Supertest, Testing Library, Playwright |
| Lint/format | ESLint and Prettier |

The model set for the direct-message phases (0–11) is five models: `User`,
`Dwelling`, `Contact`, `Conversation`, and `Message`. Maps stay frontend data and
are not Prisma models.

PR-15/PR-16 remove the legacy `ConversationMember`, `Altar`, and `AltarMembership`
tables. They were sketched before the one-to-one design and their shape does not
match what Phase 12 needs. **Phase 12 reintroduces Altar support in a redesigned
form with its own migration** — Altars are deferred, not dropped from the product.
Removing the legacy tables loses no data because there is no database and no
migration history yet; if that changes before PR-16, the rows must be exported or
the drop cancelled.

`Conversation` requirements (direct messages):

- `userOneId` and `userTwoId`.
- `@@unique([userOneId, userTwoId])`.
- `@@index([userTwoId])`.
- Canonical ordering enforced in application code (`userOneId < userTwoId` on
  create/lookup) **and** by a migration-written CHECK constraint
  (`userOneId < userTwoId`). A `<>` check alone still permits both `(A,B)` and
  `(B,A)`.
- `Message.senderId` must be one of the two participants. This is enforced by
  backend authorization, not by a database constraint (see the Phase 12 notes on
  why a composite constraint is not worth the complexity today).

## Delivery Rules

- One concern per PR.
- Every PR must include or update tests where behavior changes.
- Every PR must pass lint, tests, and build before review.
- No direct pushes to `main`.
- No group or Altar behavior may be introduced outside the Phase 12 PRs.
- No secrets or real credentials in the repository.
- Update relevant docs in the same PR that changes the contract.
- Keep the Phaser world and React shell separated by the bridge.
- Defer non-critical polish until the critical path is complete.

Quality gates (verified 2026-11-13). There is no root-level aggregate script, so
run them per workspace:

```sh
npm run lint --workspace=@dwelling/frontend
npm run lint --workspace=@dwelling/backend
npm test --workspace=@dwelling/frontend
npm test --workspace=@dwelling/backend
npm run build
```

Adding root `lint`/`test` aliases is an open improvement, not part of any PR above.

## Known Baseline Issues

| Issue | Resolution | Status |
| --- | --- | --- |
| Player walk animations are referenced but never created | PR-06 | ✅ Done 2026-11-13 (`world/animations.js`) |
| Player moves while the chat drawer is open | PR-07 | ✅ Done 2026-11-13 (`UI_STATE` input blocking) |
| `Dwelling.js` bypasses the bridge with a raw `window` event | PR-08 | ✅ Done 2026-11-13 (bridge only) |
| Schema still supports groups and Altars | PR-15, PR-16 | ⏳ Pending — legacy tables drop at PR-16; Altars return redesigned in Phase 12 |
| No authentication or authorization | PR-19 to PR-35 | ⏳ Pending |
| No contacts feature | PR-36 to PR-50 | ⏳ Pending |
| No conversation or message APIs | PR-51 to PR-59 | ⏳ Pending |
| No realtime messaging | PR-60 to PR-67 | ⏳ Pending |
| Chat uses hardcoded `RESIDENT_MESSAGES` | PR-68 to PR-80 | ⏳ Pending |
| No lint, test, or CI tooling | PR-02 to PR-05 | ✅ Done 2026-11-13 (`eslint`, `prettier`, `vitest`, CI) |
| Planning and architecture docs are stale | PR-10, PR-18, PR-29, PR-42, PR-59 | 🔄 In progress — 2026-11-13 docs reconciliation |

## Roadmap Overview

| Phase | Name | PRs |
| --- | --- | --- |
| 0 | Baseline and quality gates | 01-05 |
| 1 | Immediate runtime fixes | 06-09 |
| 2 | Data model and migrations | 10-18 |
| 3 | Backend authentication | 19-29 |
| 4 | Frontend authentication | 30-35 |
| 5 | Contacts backend | 36-43 |
| 6 | Contacts UI and world | 44-50 |
| 7 | Messaging API | 51-59 |
| 8 | Realtime messaging | 60-67 |
| 9 | Chat UI | 68-74 |
| 10 | World-to-chat integration | 75-80 |
| 11 | Hardening and launch | 81-84 |
| 12 | Altars and group conversations (future) | 85-92 |

## Phase 0: Baseline and Quality Gates — ✅ complete (2026-11-13)

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 01 | Merge `docs/m4-adr-taskboard` into `main` | All | - |
| 02 | Add backend ESLint, Prettier, Vitest, and Supertest tooling | Backend/QA | 01 |
| 03 | Add frontend ESLint, Prettier, Vitest, and Testing Library tooling | Frontend/QA | 01 |
| 04 | Add fail-fast env validation and update `.env.example` with `JWT_SECRET` | Backend | 02 |
| 05 | Add GitHub Actions CI for lint, tests, and build | QA | 02, 03, 04 |

## Phase 1: Immediate Runtime Fixes — ✅ complete (2026-11-13)

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 06 | Register player walk animations | Frontend/World | 03 |
| 07 | Block Phaser input while the chat drawer is open | Frontend/World | 03 |
| 08 | Route dwelling interactions through the React-Phaser bridge | Frontend/World | 03 |
| 09 | Clean up the map registry and map metadata | Frontend/World | 03 |

## Phase 2: Data Model and Migrations

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 10 | Approve the one-to-one-only ADR and update decision docs | Data | 01 |
| 11 | Define the API contract for auth, contacts, conversations, and messages | Backend/Frontend | 10 |
| 12 | Define shared validation and error envelope conventions | Backend | 11 |
| 13 | Add an isolated test database strategy | Data/QA | 04 |
| 14 | Define seed data and demo users | Data | 13 |
| 15 | Finalize the five-model Prisma schema and canonical conversation pair | Data | 10, 11 |
| 16 | Generate and review the initial migration with pair check and indexes | Data | 15 |
| 17 | Implement an idempotent seed script | Data | 14, 16 |
| 18 | Update database architecture documentation | Data | 15, 16 |

## Phase 3: Backend Authentication

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 19 | Install backend auth dependencies: `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `helmet`, `cors` | Backend | 04 |
| 20 | Implement password hashing and verification | Backend | 19 |
| 21 | Implement JWT issue/verify and httpOnly cookie helpers | Backend | 19 |
| 22 | Implement auth middleware and request user context | Backend | 21 |
| 23 | Implement signup with validation and duplicate-email handling | Backend | 20, 22 |
| 24 | Implement login | Backend | 20, 21 |
| 25 | Implement logout and cookie clearing | Backend | 21 |
| 26 | Implement `GET /api/auth/me` | Backend | 22 |
| 27 | Add auth rate limiting, CORS, and security headers | Backend | 23, 24 |
| 28 | Add backend auth tests | Backend/QA | 23-27 |
| 29 | Document the auth API and cookie contract | Backend | 28 |

## Phase 4: Frontend Authentication

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 30 | Add a frontend API client with credentials and error handling | Frontend | 11, 12, 23 |
| 31 | Add auth context and session bootstrap | Frontend | 30 |
| 32 | Build login and signup screens | Frontend | 31 |
| 33 | Protect the app shell and add logout | Frontend | 31, 32 |
| 34 | Handle session expiry and auth errors | Frontend | 30, 33 |
| 35 | Add frontend auth tests | Frontend/QA | 31-34 |

## Phase 5: Contacts Backend

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 36 | Implement contact service with immediate mutual-add semantics | Backend | 15, 22 |
| 37 | Implement `GET /api/contacts` | Backend | 36 |
| 38 | Implement `POST /api/contacts` | Backend | 36 |
| 39 | Implement `DELETE /api/contacts/:id` | Backend | 36 |
| 40 | Add self-add, duplicate, and unknown-user validation | Backend | 38 |
| 41 | Add backend contact tests | Backend/QA | 37-40 |
| 42 | Document the contacts API | Backend | 41 |
| 43 | Add the frontend contacts API module and state | Frontend | 30, 37, 42 |

## Phase 6: Contacts UI and World

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 44 | Build the contacts panel | Frontend | 43 |
| 45 | Build the add-contact form | Frontend | 43, 38 |
| 46 | Add contacts loading, empty, and error states | Frontend | 44 |
| 47 | Add the remove-contact confirmation flow | Frontend | 43, 39 |
| 48 | Add selected-contact state shared by the UI and world | Frontend | 43 |
| 49 | Render contact dwellings from live contacts | Frontend/World | 43, 48 |
| 50 | Add contact and world integration tests | QA | 44-49 |

## Phase 7: Messaging API

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 51 | Implement canonical one-to-one conversation service | Backend | 15, 36 |
| 52 | Implement get-or-create conversation endpoint | Backend | 51 |
| 53 | Implement list conversations endpoint | Backend | 51 |
| 54 | Implement conversation detail endpoint | Backend | 51 |
| 55 | Implement paginated message queries | Backend | 51 |
| 56 | Implement send-message endpoint | Backend | 51, 55 |
| 57 | Enforce participant authorization and message validation | Backend | 52-56 |
| 58 | Add conversation and message tests | Backend/QA | 52-57 |
| 59 | Document the messaging API and pagination contract | Backend | 58 |

## Phase 8: Realtime Messaging

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 60 | Add Socket.IO cookie authentication | Backend | 21, 28 |
| 61 | Define conversation rooms and join/leave behavior | Backend | 60 |
| 62 | Emit message-created events | Backend | 56, 61 |
| 63 | Deliver message events to both participants | Backend | 62 |
| 64 | Add typing indicators | Backend | 61 |
| 65 | Add online and presence status | Backend | 61 |
| 66 | Handle reconnect, duplicate delivery, and socket errors | Backend/Frontend | 63 |
| 67 | Add realtime tests | Backend/QA | 60-66 |

## Phase 9: Chat UI

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 68 | Add the chat API client and hooks | Frontend | 43, 59 |
| 69 | Build the conversation list | Frontend | 68, 53 |
| 70 | Build the paginated message list | Frontend | 68, 55 |
| 71 | Build the message composer | Frontend | 68, 56 |
| 72 | Add optimistic send and delivery states | Frontend | 71 |
| 73 | Connect the chat UI to Socket.IO events | Frontend | 63, 67, 72 |
| 74 | Add chat UI tests | Frontend/QA | 69-73 |

## Phase 10: World-to-Chat Integration

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 75 | Replace mock `RESIDENT_MESSAGES` with real conversation data | Frontend/World | 49, 68 |
| 76 | Open the correct conversation from a dwelling | Frontend/World | 75 |
| 77 | Persist the selected contact and last map | Frontend/World | 76 |
| 78 | Align chat focus, keyboard, and accessibility behavior | Frontend/World | 07, 76 |
| 79 | Add world/chat empty, offline, and error states | Frontend/World | 75 |
| 80 | Add a world-to-chat end-to-end test | QA | 76-79 |

## Phase 11: Hardening and Launch

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 81 | Authorization and security audit | Backend/QA | 57, 60, 80 |
| 82 | Performance and bundle cleanup | Frontend/QA | 80 |
| 83 | Complete the end-to-end suite and make CI the merge gate | QA | 80, 81 |
| 84 | Add deployment runbook and launch checklist | All | 81-83 |

## Phase 12: Altars and Group Conversations (future)

**Status:** scheduled after the direct-message phases. ADR-0015 states the product
rule (more than two people share a conversation only in an Altar). **Option A is
approved** (ADR-0021) and no direct-message decision is left open; the schema and
migration plan are in
[`../architecture/database.md`](../architecture/database.md#phase-12-extension-altars-and-group-conversations).
PR-85's documentation work (this section, ADR-0015, ADR-0021, the database and
design docs) is done; the code PRs remain.

A group conversation always belongs to an Altar. The Altar is a shared place in
the world with persistent membership; its conversation is the Altar's message
thread. Direct conversations stay strictly one-to-one and are unaffected.

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 85 | Reinstate ADR-0015 and document the Altar/group-conversation target model (docs done) | All | 84 |
| 86 | Extend the schema with `Altar`, `AltarMembership`, and group conversation support | Data | 85 |
| 87 | Generate and review the Phase 12 migration (additive, no data loss) | Data | 86 |
| 88 | Implement the Altar membership service and API | Backend | 87 |
| 89 | Create-or-join an Altar conversation; authorize its participants | Backend | 88 |
| 90 | Group message API with pagination and sender authorization | Backend | 89 |
| 91 | Socket.IO rooms per Altar: group delivery, typing, presence | Backend | 63, 90 |
| 92 | Altar interaction in the world, group chat UI, and end-to-end tests | Frontend/QA | 91 |

### How Phase 12 extends the five-model schema

The direct-message schema is kept, not replaced. `User`, `Dwelling`, `Contact`,
and `Message` are unchanged; `Conversation` is extended and the two Altar tables
return in a redesigned shape. Two shapes were considered:

**Option A (approved) — one conversation model with a kind.**

- `Conversation` gains `kind` (`DIRECT` | `ALTAR`), a nullable `altarId`, and the
  pair columns become nullable.
- `ConversationMember` returns as the participant table, used only by `ALTAR`
  conversations. One Altar has exactly one conversation (`altarId` unique).
  **Only current members may read or send**, enforced in the backend on every
  read and every send, not just in the UI.
- Hand-written CHECK constraints keep both shapes honest:
  `kind = 'DIRECT'` requires both pair columns, no `altarId`, and
  `userOneId < userTwoId`; `kind = 'ALTAR'` requires `altarId` and no pair
  columns. Member count cannot be a CHECK (it spans rows), so "two or more
  members" is enforced by the service.
- The direct-pair uniqueness becomes a partial unique index on
  `(userOneId, userTwoId) WHERE kind = 'DIRECT'`.
- `AltarMembership` has `@@unique([altarId, userId])`; membership is required
  before a user can join the Altar conversation (service-enforced).
- One message model, one pagination contract, one socket room concept
  (`altar:<id>` for groups, `conversation:<id>` for direct).

**Option B — a separate group-conversation model.**

- Leave `Conversation` untouched and add `AltarConversation` with its own
  membership and message storage.
- Stronger compile-time 1:1 typing, but duplicates message storage, pagination,
  realtime delivery, and the conversation list in the UI.

**Decision: Option A** (ADR-0021). The cost is that the direct-message invariant
moves from column nullability to CHECK constraints and a partial index. That is one
additive migration, covered by tests, and it avoids two parallel message stacks.
Existing direct conversations and messages are preserved: `kind` is added with a
constant default `'DIRECT'`, the pair columns are relaxed but never cleared, and
`Message` is not modified. The full step-by-step is in
[`../architecture/database.md`](../architecture/database.md#how-phase-12-preserves-existing-direct-conversations-and-messages).

**Model implications.** The legacy `Altar`/`AltarMembership` are dropped at PR-16
and recreated in Phase 12 with a conversation link; nothing is migrated because no
database exists yet. `Altar` stores identity and membership only — world position
stays frontend map data, consistent with the map rule. `ConversationMember` is
reintroduced for groups only; it is not needed for direct conversations.

**Message sender.** Group messages require the sender to be an Altar member.
Authorization happens in the service layer, as for direct messages; no composite
foreign key is added.

## Critical Path

```text
01
02/03 -> 04 -> 15 -> 16
19 -> 21 -> 22 -> 23/24
36 -> 51 -> 56
60 -> 62 -> 63
68 -> 71 -> 72 -> 73
75 -> 76 -> 80 -> 83
85 -> 86 -> 87 -> 88 -> 89 -> 91 -> 92
```

## Parallel Work Waves

| Wave | Can run in parallel |
| --- | --- |
| A | 02 and 03; then 04 and 05 |
| B | 06, 07, 08, and 09 after 03 |
| C | 10-14 while 15-16 are prepared |
| D | 19-29 backend auth and 30-35 frontend auth after PR-11 |
| E | 36-43 contacts backend while 44-48 UI work starts after PR-43 |
| F | 51-59 messaging API and 60-67 realtime after PR-36 |
| G | 68-74 chat UI after PR-59 and PR-67 |
| H | 75-80 world integration after PR-49 and PR-68 |
| I | 81-84 hardening after the critical path is green |
| J | 85-92 Altars after the direct-message critical path is green |

## Definition of Done

A PR is complete only when:

- The behavior is implemented.
- Authorization is enforced server-side.
- Loading, empty, and error states are handled where applicable.
- Tests cover the new behavior, including failure cases.
- Lint, tests, and build pass.
- Relevant API, architecture, and decision docs are updated.
- No secrets, debug logs, or unrelated changes are included.
- The PR can be reviewed and reverted independently.

## Deadline Note

This is the full 84-PR plan. If the 16 November 2026 deadline still applies, use the earlier approximately 47-hour MVP subset instead:

- Prioritize PR-01 through PR-09.
- Include PR-15, PR-16, and PR-19 through PR-35 for auth.
- Include PR-36 through PR-48 for contacts.
- Include PR-51 through PR-63 for messaging and basic realtime.
- Include PR-68 through PR-76 for the chat UI and world hookup.
- Include PR-78 and PR-81 for focus/accessibility and security.
- Defer polish, presence, typing indicators, persistence extras, and full E2E coverage.
- Phase 12 (Altars and group conversations) is **not** part of this MVP subset.
