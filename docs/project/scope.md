# Scope

This document answers one question: **what is being built right now, and what is
explicitly not?**

The current phase is **frontend development**, extended from seven days to
**ten** during the requirements session (ADR-0014). The goal is a usable,
navigable 2D world with a controllable character, placed dwellings, a shared
interior, a visible Altar, and a working conversation drawer — using a real
16-bit asset set.

---

## In scope now (ten-day frontend phase)

- A Phaser 3 game mounted inside the existing frontend shell, keeping the HTML
  layout intact.
- A real **16-bit pixel-art asset set**: CC0 packs for tiles, houses, props and
  furniture, plus code-authored art for Dwelling-specific pieces, with every
  licence recorded in `CREDITS.md` (NFR-014). See
  [`../design/assets.md`](../design/assets.md).
- A tiled world with defined dimensions, solid obstacles, and a camera that
  follows the player and is clamped to the map.
- A player character with **arrow key and WASD** movement, delta-time speed,
  normalized diagonals, and a walk animation per direction.
- Dwellings placed from **data**, each bound to a contact id, with an
  interaction zone, a visible prompt, and a key to act.
- **Door zones** on dwelling doors that lead into the interior.
- **A shared interior room** containing a fireplace, a kitchen area and a bed,
  with correct return to the door that was entered (FR-030, FR-031).
- **Two alphabet maps** with a selector or portal, plus HUD identification.
- A **slide-out conversation drawer** over the fullscreen canvas (ADR-0017),
  opened by interaction, with **mock content visibly labelled as mock**
  (FR-032, FR-033).
- The **Altar rendered as scenery** visible and distinct, placed by map data.
  It is **not interactive** this phase (FR-026). Group conversations are a
  planned future feature (see Below).
=======
- **One-to-one conversations only** — exactly two participants between mutual
  contacts; group conversations are not part of the product (ADR-0020).
- A **docked conversation sidebar** replacing the Conversations panel, opened by
  interaction, with **mock content visibly labelled as mock** (FR-032, FR-033).
- The **Altar rendered as scenery**: visible, distinct, placed by map data, and
  explicitly **not** interactive (FR-026).
- A minimal HUD: current map name and interact prompt.
- Screenshots and a demo script suitable for the graded report (DW-042).

## Out of scope for now

### Farms
Requested during the requirements session and **deferred by choice** (DW-B01).
"Work at a farm to earn something" needs an activity and reward design that does
not exist yet, and it depends on real messaging for the chat half.

### Achievements
Deferred (DW-B02). Displaying a list is cheap, but the unlock rules and their
persistence are undecided. Nothing to unlock exists yet.

### Real-time communication
No messaging is implemented or being implemented. Sockets exist as scaffolding
(`server:ready` only) and **no client opens a connection**
([`../architecture/realtime.md`](../architecture/realtime.md)).

### Backend and database work
The Express API, Socket.IO, Redis module and Prisma client exist but are not
being extended. **No migrations have been generated.** The frontend does not talk
to the backend or the database in this phase
([`../architecture/backend.md`](../architecture/backend.md)).

### Altar interaction and group conversations
**Direct messages only in this phase; Altars are Phase 12.** Altars stay part of
the product vision ([`plan.md`](../planning/plan.md)): a group conversation
always belongs to an Altar, membership persists, and `ConversationMember` returns
for group participants in that later phase. The five-model schema used by Phases
0–11 stays one-to-one; the legacy `Altar`/`AltarMembership` tables are dropped at
PR-15/PR-16 and rebuilt in Phase 12 in a redesigned shape. In this phase the
Altar is **scenery only**, with no prompt that promises a group chat.
=======
### Group conversations and Altar interaction
**Not supported.** Conversations are one-to-one only: every conversation has
exactly two participants, between mutual contacts, with no group chat and no group
membership (ADR-0020, ADR-0021). The earlier allowance for group conversations at
an Altar (ADR-0015) is withdrawn.

The Altar stays **scenery** — visible, distinct and placed by map data, but never
interactive (FR-026). FR-027 and DW-B03 are withdrawn with the group feature.

### Personalised interiors
Every dwelling opens the **same shared room** this phase (ADR-0012). Distinct
rooms per contact are a data change later (DW-B04).

### Player identity
The player is a generic cozy character. Names, avatars and accounts belong to the
auth phase (DW-B05).

### Audio
No sound assets exist and none are being sourced (DW-B06).

### Touch and mobile input
Desktop-first with a small-screen-usable layout (DW-B07). A phone user gets a
readable page they cannot control — an accepted limitation.

### Authentication, security and caching
No auth, authorization, validation, rate limiting, or caching is implemented or
being implemented. Requirements are recorded in
[`../architecture/security-and-caching.md`](../architecture/security-and-caching.md)
so they are not forgotten, not so that they get built now.

### Production concerns
Deployment, hosting, CI and monitoring are out of scope for a college project at
this stage.

---

## Scope discipline

- If a task does not move the frontend toward "walk around a world, enter a
  house, approach a dwelling, get feedback," it does not belong in the current
  milestone.
- Backend/database/security documents are **reference material**. Reading them is
  fine; starting work from them is not until the frontend milestone is Done.
- New ideas go into [`planning/roadmap.md`](../planning/roadmap.md) under a later
  stage, or into the backlog in [`planning/task-board.md`](../planning/task-board.md)
  — not into the current day's task list.
- Any scope change is recorded in [`planning/decisions.md`](../planning/decisions.md).
- **Document nothing as working that is mock.** The conversation drawer shows
  fake data by design and must say so on screen (FR-033).
  The Altar is present as scenery but not functional; group chat arrives with
  Altars in Phase 12 of [`plan.md`](../planning/plan.md).
