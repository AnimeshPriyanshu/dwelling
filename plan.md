# Dwelling Implementation Plan

Status: approved roadmap, not yet implemented.
Scope: 84 independently reviewable PRs across 12 phases.

Work locally. Do not commit, push, or open PRs unless explicitly requested.

## Product Scope

Dwelling is a 2D social chat website with one-to-one conversations only.

In scope:

- Email/password authentication.
- Mutual contact adding without a request/accept flow.
- One-to-one conversations between contacts.
- Persisted message history with pagination.
- Realtime message delivery, typing indicators, and presence.
- Contact dwellings rendered dynamically in the existing Phaser world.
- Opening a real conversation by interacting with a contact's dwelling.

Out of scope:

- Group chat.
- Group membership.
- Altar-based conversations and Altar membership.
- Request/accept contact workflows.
- Perfect alphabet-aware map authoring.

## Approved Architecture Decisions

| Area | Decision |
| --- | --- |
| Frontend | React, JavaScript, Vite, Phaser 3 |
| Backend | Node.js, Express, Socket.IO |
| Data | Prisma, PostgreSQL on Supabase |
| Auth | Email/password, `bcryptjs`, JWT in an httpOnly cookie, `cookie-parser` |
| Socket auth | Reuse the same auth cookie |
| Contacts | Immediate mutual add; no request/accept state |
| Conversations | Exactly two participants, stored as `userOneId` and `userTwoId` |
| Conversation ordering | Canonical `userOneId < userTwoId` |
| World | Render contact dwellings dynamically; defer full map re-authoring |
| Tests | Vitest, Supertest, Testing Library, Playwright |
| Lint/format | ESLint and Prettier |

Final Prisma model set should be five models: `User`, `Dwelling`, `Contact`, `Conversation`, and `Message`.

Remove `ConversationMember`, `Altar`, and `AltarMembership`. Maps stay frontend data and are not Prisma models.

`Conversation` requirements:

- `userOneId` and `userTwoId`.
- `@@unique([userOneId, userTwoId])`.
- `@@index([userTwoId])`.
- Database check: `userOneId <> userTwoId`.

## Delivery Rules

- One concern per PR.
- Every PR must include or update tests where behavior changes.
- Every PR must pass lint, tests, and build before review.
- No direct pushes to `main`.
- No group or Altar behavior may be introduced.
- No secrets or real credentials in the repository.
- Update relevant docs in the same PR that changes the contract.
- Keep the Phaser world and React shell separated by the bridge.
- Defer non-critical polish until the critical path is complete.

Expected commands once tooling exists:

```sh
npm run lint
npm test
npm run build
```

## Known Baseline Issues

| Issue | Resolution |
| --- | --- |
| Player walk animations are referenced but never created | PR-06 |
| Player moves while the chat drawer is open | PR-07 |
| `Dwelling.js` bypasses the bridge with a raw `window` event | PR-08 |
| Schema still supports groups and Altars | PR-15, PR-16 |
| No authentication or authorization | PR-19 to PR-35 |
| No contacts feature | PR-36 to PR-50 |
| No conversation or message APIs | PR-51 to PR-59 |
| No realtime messaging | PR-60 to PR-67 |
| Chat uses hardcoded `RESIDENT_MESSAGES` | PR-68 to PR-80 |
| No lint, test, or CI tooling | PR-02 to PR-05 |
| Planning and architecture docs are stale | PR-10, PR-18, PR-29, PR-42, PR-59 |

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

## Phase 0: Baseline and Quality Gates

| PR | Title | Lane | Depends on |
| --- | --- | --- | --- |
| 01 | Merge `docs/m4-adr-taskboard` into `main` | All | - |
| 02 | Add backend ESLint, Prettier, Vitest, and Supertest tooling | Backend/QA | 01 |
| 03 | Add frontend ESLint, Prettier, Vitest, and Testing Library tooling | Frontend/QA | 01 |
| 04 | Add fail-fast env validation and update `.env.example` with `JWT_SECRET` | Backend | 02 |
| 05 | Add GitHub Actions CI for lint, tests, and build | QA | 02, 03, 04 |

## Phase 1: Immediate Runtime Fixes

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
| 30 | Add a frontend API client with credentials and error handling | Frontend | 11, 23 |
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

## Critical Path

```text
01
02/03 -> 04 -> 15 -> 16
19 -> 21 -> 22 -> 23/24
36 -> 51 -> 56
60 -> 62 -> 63
68 -> 71 -> 72 -> 73
75 -> 76 -> 80 -> 83
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
