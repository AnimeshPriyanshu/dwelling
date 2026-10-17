# Roadmap

Dwelling is built in stages. Each stage produces something observable; later
stages depend on earlier ones. This is the long view — the **current work** is
always the ten-day plan in [`milestones.md`](milestones.md).

```text
Stage 0  Scaffold                ✅ repository structure, tooling, schema placeholders
Stage 1  Playable world          ▶ CURRENT — render, move, collide, interact   (Days 1–5)
Stage 2  Maps and rooms          ▶ data-driven maps, second map, shared interior (Days 6, 8)
Stage 3  Interface integration   ▶ canvas ↔ HTML, conversation sidebar        (Days 7, 9)
Stage 4  Realtime messaging      ▢ sockets, message delivery, history
Stage 5  Presence & Altars       ▢ online status, shared gathering spaces
Stage 6  Activities              ▢ farms, working, achievements
Stage 7  Accounts & security     ▢ auth, validation, rate limiting, caching
Stage 8  Polish & delivery       ▢ performance, accessibility, deployment
```

> Stages 1–3 **are** the ten-day frontend phase. Everything from Stage 4 onward is
> **not** in the current scope — see [`project/scope.md`](../project/scope.md).

---

## Stage 0 — Scaffold ✅

**Goal:** a monorepo that runs, with the intended boundaries established.

**Delivered in the repository today:** npm workspaces (`frontend`, `backend`,
`database`, `shared`), a Vite + Phaser 3 frontend shell, an Express + Socket.IO
backend with a health endpoint, optional Redis cache module, Prisma schema
(no migrations), and this documentation set.

**Evidence:** root `package.json`, `backend/src/**`,
`database/prisma/schema.prisma`, `shared/src/index.js`,
[`../architecture.md`](../architecture.md).

---

## Stage 1 — Playable world ▶ *(current)*

**Goal:** one map you can walk around, with dwellings you can approach, doors you
can enter, and feedback you can see — in real 16-bit art.

- Real asset set sourced and licensed (CC0 packs + authored pieces).
- Initial scene with a tiled ground and defined boundaries.
- Player character with keyboard movement and a walk animation.
- Collision with props and world edges; camera follow, clamped.
- Dwellings placed from data, with interaction zones, prompts, and an interact key.

**Success:** a person can open the app, walk to a house, see a prompt naming the
contact, and press a key to trigger that contact's interaction.

Covers **Days 1–5** of the plan.

---

## Stage 2 — Maps and rooms ▶

**Goal:** the world stops being one hard-coded scene, and "somewhere else" includes
the inside of a house.

- A map data format (id, range, size, spawn, dwellings, doors, obstacles, Altar).
- A registry so maps load by id instead of being duplicated in scene code.
- A **second alphabet map** and a minimal selector or portal.
- **One shared interior room** reached through a dwelling's door, with a correct
  return position.

**Success:** adding a third map is a data change, not a code change — and entering
a house feels like going somewhere rather than opening a menu.

Covers **Days 6 and 8**.

---

## Stage 3 — Interface integration ▶

**Goal:** the canvas and the HTML UI work as one product.

- A DOM bridge so scene events reach the HTML UI.
- A **docked conversation sidebar** that opens on interaction and closes cleanly,
  with mock content **labelled as mock**.
- A minimal HUD: current map name and interact prompt.
- The **Altar** rendered as a distinct landmark (scenery only).
- A visual consistency pass so exteriors, interiors and HUD look like one game.

**Success:** interacting with a dwelling opens a sidebar naming the right contact,
without reloading the page and without covering the world.

Covers **Days 7 and 9**.

---

## Stage 4 — Realtime messaging ▢

**Goal:** messages actually travel between users.

- Socket event contract for sending and receiving messages.
- Conversation membership resolution, with **1:1 conversations private to their
  two members** and group conversations belonging to Altars (ADR-0015).
- Persisting messages via Prisma — requires the first migration.
- Loading history when a conversation opens, replacing the labelled mock data.

**Depends on:** Stage 3 (a sidebar to send from), plus backend and database work
currently out of scope.

---

## Stage 5 — Presence & Altars ▢

**Goal:** shared space becomes real.

- Online/offline presence for contacts, replacing the static indication.
- Altars become interactive, multi-user spaces (FR-027).
- Group conversation entry points.
- Shared player movement — the authority model is still **Undecided** (full
  authoritative movement versus lightweight presence).

**Depends on:** Stage 4.

---

## Stage 6 — Activities ▢

**Goal:** the world has something to *do* beyond talking — the farms and
achievements requested on 2026-10-17 (DW-B01, DW-B02).

- Farms as a third location type: travel there, work, and chat.
- An activity loop with an outcome worth having.
- Achievement definitions with unlock rules, and a panel to display them.
- Persistence for unlocked achievements — local first, server-side once accounts exist.

**Depends on:** Stage 2 (location types), Stage 4 (chat at a farm) and, for
persistence, Stage 7.

**Note:** these were deliberately kept out of the ten-day phase rather than
half-built. The design work — what "working" actually does — has not started.

---

## Stage 7 — Accounts & security ▢

**Goal:** the system is safe to open to more than one trusted user.

- Authentication and session handling; a real player identity.
- Authorization on conversations, dwellings and Altars, enforced server-side.
- Input validation, rate limiting, secure configuration, and caching.

See [`../architecture/security-and-caching.md`](../architecture/security-and-caching.md).

---

## Stage 8 — Polish & delivery ▢

**Goal:** presentable and stable.

- Performance pass and asset optimization.
- Accessibility pass over the DOM UI, including a non-canvas navigation path.
- Touch/mobile input if it is ever wanted (DW-B07).
- Deployment and demo preparation.

---

## Prioritization rule

When choosing what to do next, prefer work that makes the **world playable** over
work that makes it complete. A rough world you can walk around teaches more than a
polished system you cannot open.
