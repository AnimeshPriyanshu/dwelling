# Maps and Rooms

How the world is divided, how a contact ends up on a map, and how maps and
interior rooms are loaded and switched.

> **Exterior maps are implemented (M6).** The data shape below is settled and
> recorded in ADR-0018. Doors, interiors and Altar rendering remain planned for
> Milestones 8–9.

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
| `a-c` | A–C | **Starting map** — implemented as Alder Creek (M5 dwellings preserved) |
| `s-u` | S–U | **Second map** — implemented as Sunhollow (DW-034) |
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
| `id` | Stable key such as `a-c` | Implemented |
| `name` / `range` | Label shown in the HUD | Implemented |
| `size` | World dimensions in tiles | Implemented |
| `spawn` | Player start position on load | Implemented |
| `dwellings` | Position + contact id per house | Implemented |
| `doors` | Position + which interior/return point each door leads to | Data only (M8) |
| `obstacles` | Positions/sizes of blocking props | Implemented |
| `paths` | Roads and trails as tile rectangles | Implemented |
| `altar` | Altar position (scenery) | Data only (M9) |
| `ground` | Ground tile pattern | Implemented as optional `groundTile`, shared default |

### Implemented format (DW-032)

Map files live in `frontend/src/world/maps/` and export a plain object. The
contract is documented in `maps/format.js`; the registry is `maps/index.js`.

```js
{
  id: 'a-c',                 // stable registry key
  name: 'Alder Creek',       // HUD label
  range: 'A–C',              // HUD label
  size: { columns: 60, rows: 40 }, // tiles; pixels derive from TILE_SIZE
  groundTile: 65,            // optional world tileset frame (Sunnyside grass)
  spawn: { x: 480, y: 320 },
  dwellings: [{ id, contactId, name, contact, role, x, y, sprite, radius, bodyHeight }],
  paths: [{ x: 0, y: 19, w: 60, h: 2 }], // tile rectangles: streets and trails
  doors: [],                 // reserved for M8
  obstacles: [{ x, y, sprite, frame?, width, height, offsetX, offsetY }],
  altar: { x, y } | null,    // reserved for M9 scenery
}
```

- Shared values (`TILE_SIZE`, viewport, default ground frame) stay in
  `frontend/src/world/constants.js`.
- `sprite` is a texture key declared in `world/assets.js`, never a file path.
  Dwellings are complete supplied cottage images; obstacles may be images or
  spritesheet frames. `frame` is only meaningful for a spritesheet texture.
- Validation rejects malformed sizes, out-of-bounds positions, duplicate
  dwelling/contact ids, missing sprite keys, and incomplete body geometry.
  Invalid or duplicate maps are logged and skipped by `registerMap`.
- Unknown ids return `null`; the running scene stays on its current map.

**Requirement:** no dwelling, door, obstacle or Altar position is hard-coded
inside a scene (FR-018). Verified by inspecting `WorldScene` after the move.

---

## Terrain: paths and forest

Two helpers in `frontend/src/world/maps/terrain.js` turn a map's layout data
into terrain, so a map file stays readable:

- **`buildPathCells(paths, columns, rows)`** rasterises the `paths` rectangles
  into a set of `"column,row"` cells. `WorldScene.createPaths` renders that grid
  as a second tilemap layer above the grass, using the fully opaque fill tiles
  from the supplied Sprout Lands dirt sheet (`PATH_TILE_FRAMES` in
  `world/assets.js`). Cells outside a path are set to `-1`, so nothing is drawn
  there.
- **`scatterForest(...)` / `scatterRocks(...)`** generate the obstacle list at
  module load from an integer seed: a jittered grid of tree positions, thinned
  near roads (open verges), cleared around dwellings, spawn and the altar, and
  clumped with smooth value noise so the woods form stands and glades rather
  than an even sprinkle. Rock positions come from the same seed-driven loop.

Because the scatter is seeded, a map looks identical on every load and a diff
never contains hundreds of coordinates. Tuning knobs are the `spacing`,
`density` and clump range passed to `scatterForest`.

Paths are drawn as square tiles at 16×16, the sheet's native size: the supplied
kit has no outer-corner autotile pieces for a road edge, so paths use their
opaque fill frames and take their shape from the map layout instead of
guessing at edge masks.

**Alignment rule.** A dwelling's `x` sits on a tile boundary (a multiple of
16, e.g. 224 = 16 × 14) and its `y` puts the house base on a tile boundary
(`y + 56`), so a two-tile spur at columns `x/16 − 1` and `x/16` is centred on
the door and starts exactly at the threshold. Both maps keep every path
rectangle on whole tiles for that reason; a hand-placed house must follow the
same rule or its door will sit half a tile off its path.

### Farms

A farm is data too: `farms: [{ x, y, w, h, gate, crop }]`, in tiles. `x`/`y`/`w`/`h`
describe the **tilled soil**; the rail fence is drawn one tile outside it, so a
plot must keep a tile of margin from the map edge (the validator enforces this).
`gate` (`north`/`south`/`east`/`west`) names the edge the fence opens on, and the
two gate tiles are centred on that edge. `crop` picks the growth sequence
(`wheat` or `root`).

`world/farm.js` derives everything else — soil cells, fence frames, crop frames
— so a map never stores pixel positions for a plot. Crops take a growth stage
from a hash of their cell, which makes a field a patchwork instead of a solid
block and keeps it identical on every load. Trees and rocks are kept out of the
plot and one tile around it, and a gate is worth aligning with a path: a-c puts
its gate on a two-tile threshold off the main street, s-u opens its gate
directly onto the back lane.

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
- **Implemented:** `world/maps/index.js` maps `id → data`, so adding a map is a
  data file plus one `registerMap` call. A runtime-registered third map was
  switched to without touching `WorldScene`.

Loading a map (**implemented in `WorldScene.loadMap`**):

```text
load map id
  → read map data from the registry (unknown id → keep current map)
  → clear map-owned objects + active prompt
  → draw ground over the map's size
  → draw paths above the ground
  → place obstacles → create colliders (player collider is reused)
  → place dwellings  → create interaction zones
  → store doors/altar data (rendering deferred to M8/M9)
  → place the player at map.spawn
  → set world/camera bounds to map.size
  → publish map:changed → React updates the HUD
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
- **Implemented:** a minimal HTML `<select>` in the HUD lists registered maps;
  choosing one requests a switch through the bridge and the world repopulates at
  that map's spawn. No page reload, no scene restart.
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
- **Implemented:** the HUD shows the map's `name`/`range` from `map:changed` —
  never hard-coded text — alongside the map selector.
- **Proposed:** show the dwelling/room name when inside a shared interior, so the
  player knows which house they are standing in.

---

## Altar and maps

- **Confirmed:** the Altar is placed by map data and rendered as scenery (FR-026).
- **Undecided:** whether Altars live inside alphabet maps, in separate shared
  maps, or both. The concept describes them as shared gathering places, which
  suggests they may not belong to any single letter range.
- **Planned — Phase 12:** Altar interaction (FR-027, DW-B03, [`../planning/plan.md`](../planning/plan.md)).

---

## Open questions

| Question | Status |
| --- | --- |
| Exact map and room data field names | Map fields settled in DW-032 / ADR-0018; room fields in DW-050 |
| Whether one scene is reused for maps and rooms | Confirmed: reused (ADR-0018) |
| How non-alphabetic names are handled | Undecided |
| What happens when an alphabet range gets crowded | Undecided |
| Whether maps are spatially adjacent | Undecided (long term) |
| Map size in tiles | Authored per map: `a-c` 60×40, `s-u` 56×35; must remain at least the 800×400 viewport |
| Where Altars live long term | Undecided (deferred) |
| Whether maps or rooms become server data | Undecided |

## Related

- [`game-world.md`](game-world.md) — mechanics that maps configure
- [`../planning/milestones.md`](../planning/milestones.md) — Milestones 6 and 8
- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0006, ADR-0012
- [`../project/glossary.md`](../project/glossary.md) — Map, Room, Tile, Spawn, Door
