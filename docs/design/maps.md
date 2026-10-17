# Maps and Rooms

How the world is divided, how a contact ends up on a map, and how maps and
interior rooms are loaded and switched.

> **Nothing here exists yet.** This documents the agreed model, marked
> accordingly. The exact data field names are settled in DW-032.

---

## Why maps exist

A single world containing every contact would grow unbounded and become
unnavigable. Dwelling splits the world into **maps**, each holding a smaller set
of contacts, so you know roughly where to look for someone.

Spatial memory is the point: if "Sarah" lives in a map with an S name on it, that
is a usable mental model in a way that "page 4 of a contact list" is not.

---

## Alphabet-based organization

Contacts are grouped by the **first letter of their name** (FR-017).

| Map id | Range | Role this phase |
| --- | --- | --- |
| `a-c` | A–C | **Starting map** — the one authored in detail (DW-027) |
| `s-u` | S–U | **Second map** — proves switching works (DW-034) |
| `d-f`, `g-i`, `j-l`, `m-o`, `p-r`, `v-z` | — | Registered in the scheme, not authored yet |

- **Confirmed (ADR-0006):** alphabet ranges with stable string ids such as `a-c`.
- **Confirmed:** a contact belongs to exactly one map, derived from their name.
- **Confirmed:** each map is authored as an island; there is no spatial adjacency
  between alphabet maps.
- **Undecided:** names starting with digits, symbols, or non-Latin characters. A
  catch-all map is one option; not designed.
- **Undecided:** display name vs. username for the first-letter rule.

### Range crowding

`S–U` will collect more contacts than `V–Z` under most name distributions. A
future rule (splitting a range, or an overflow map) may be needed. **Known
limitation, not designed now.**

---

## What a map is

A map is **data**, not scene code (FR-018). Required concepts:

| Concept | Purpose | Status |
| --- | --- | --- |
| `id` | Stable key such as `a-c` | Proposed |
| `name` / `range` | Label shown in the HUD | Proposed |
| `size` | World dimensions in tiles | Proposed |
| `spawn` | Player start position on load | Proposed |
| `dwellings` | Position + contact id per house | Proposed |
| `doors` | Position + which interior/return point each door leads to | Proposed |
| `obstacles` | Positions/sizes of blocking props | Proposed |
| `altar` | Altar position (scenery) | Proposed |
| `ground` | Ground tile pattern | Undecided — may not be per-map |

> **The exact shape is settled in DW-032**, not here. Treat this as the required
> *concepts*. Once fixed, the format is recorded in
> [`../planning/decisions.md`](../planning/decisions.md), because every map and
> room depends on it.

**Requirement:** after DW-032, no dwelling, door, obstacle or Altar position may
be hard-coded inside a scene (FR-018).

---

## Rooms: interiors use the same machinery

Interiors are intentionally **not** a parallel system (ADR-0012):

- A room is the same kind of data as a map — a bounded area with obstacles,
  a spawn, and now a door back out.
- **Confirmed:** every dwelling opens the **same shared room** (one template),
  not a room per contact (DW-051).
- **Confirmed:** the room contains a fireplace, a kitchen area and a bed (FR-031).
- **Proposed:** the same scene renders both a map and a room, so mask/room switching
  is a data swap rather than a scene switch (DW-052).

```text
data/
├── maps/     a-c, s-u, …          (exteriors; contain dwellings, doors, altar)
└── rooms/    shared-home          (interiors; contain walls, furniture, exit door)
```

| Concept | Maps | Rooms |
| --- | --- | --- |
| Bounds | Yes | Yes |
| Obstacles | Props | Walls and furniture |
| Spawn | Fixed per map | At the room's door on entry |
| Exit | Map selector | The door, back to the dwelling that was entered |
| Altar | Yes (scenery) | No |

---

## Registry and loading

- **Confirmed:** the game can load any registered map by id (FR-019).
- **Proposed:** a registry maps `id → data`, so adding a map is a data addition.
  Adding a third map in data alone is an explicit acceptance criterion for DW-034.

Loading a map (**proposed**):

```text
load map id
  → read map data from the registry
  → clear the current world contents
  → draw ground over the map's size
  → place obstacles → create colliders
  → place dwellings  → create interaction zones
  → place doors      → create (smaller, priority) door zones
  → place the Altar  → scenery only, no zone
  → place the player at map.spawn
  → set world/camera bounds to map.size
  → update the HUD with the map name
```

Entering and leaving an interior (**proposed**, DW-052/DW-054):

```text
press E in a door zone
  → remember which dwelling's door was used
  → swap the world contents for the shared room
  → spawn the player just inside the room's door
  → set bounds to the room size

press E in the room's exit zone
  → restore that dwelling's map
  → spawn the player in front of the door that was entered
```

- **Confirmed:** changing maps or rooms must never reload the page.
- **Confirmed:** the **return position must correspond to the door actually used**
  — the most likely bug of Day 8, so test with two dwellings, not one.

---

## Transitions and selection

- **Confirmed:** the player moves between alphabet maps through a **selector or
  portal** (FR-020), not by walking off an edge.
- **Proposed for this phase:** a minimal HTML selector listing registered maps;
  choosing one reloads the world at that map's spawn.
- **Not required this phase:** walkable portals between maps, animated transitions,
  or spatial adjacency.
- **Undecided (long term):** whether maps are ever spatially connected (walking
  east out of `a-c` arrives in `d-f`). Currently treated as separate areas.

**Kept deliberately small:** DW-034 is a half-day at most and must not consume
Day 6 at the expense of the bridge (DW-035).

---

## HUD

- **Confirmed:** the current map is identified in the UI (FR-021).
- **Confirmed:** the HUD is **minimal** — map name plus the interact prompt only.
  Contact lists, settings and notifications are out of scope this phase.
- **Proposed:** an HTML element showing the map's `name`/`range`, updated by the
  data-driven load — never hard-coded text.
- **Proposed:** show the dwelling/room name when inside a shared interior, so the
  player knows which house they are standing in.

---

## Altar and maps

- **Confirmed:** the Altar is placed by map data and rendered as scenery (FR-026).
- **Undecided:** whether Altars live inside alphabet maps, in separate shared
  maps, or both. The concept describes them as shared gathering places, which
  suggests they may not belong to any single letter range.
- **Deferred:** Altar interaction (FR-027, DW-B03).

---

## Open questions

| Question | Status |
| --- | --- |
| Exact map and room data field names | Settled in DW-032 |
| Whether one scene is reused for maps and rooms | Proposed: reused |
| How non-alphabetic names are handled | Undecided |
| What happens when an alphabet range gets crowded | Undecided |
| Whether maps are spatially adjacent | Undecided (long term) |
| Map size in tiles | Undecided (working range: 30×20 – 40×25) |
| Where Altars live long term | Undecided (deferred) |
| Whether maps or rooms become server data | Undecided |

## Related

- [`game-world.md`](game-world.md) — mechanics that maps configure
- [`../planning/milestones.md`](../planning/milestones.md) — Milestones 6 and 8
- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0006, ADR-0012
- [`../project/glossary.md`](../project/glossary.md) — Map, Room, Tile, Spawn, Door
