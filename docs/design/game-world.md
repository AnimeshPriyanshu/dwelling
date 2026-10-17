# Game World Design

How the world looks, how the player moves through it, and how interaction works.

**Status markers**

- **Confirmed** — decided in the requirements session or by a requirement (linked
  as `FR-*`/`NFR-*`). Do not change without a decision record.
- **Proposed** — the working approach for this phase; not yet built.
- **Undecided** — no decision made. Do not build on it yet.

---

## The world concept

A map is a bounded, top-down 2D area with a slight 3/4 tilt. The player walks
around it, passes dwellings (houses), a door that leads into an interior, and the
Altar. Walking up to a dwelling announces who lives there and lets the player open
that conversation.

- **Confirmed:** the world renders in a Phaser canvas (FR-001), split into
  alphabet maps (FR-017), each described by data rather than scene code (FR-018).
- **Confirmed:** the starting map is `A–C`; a second map proves switching (DW-034).

### Perspective and draw order

Top-down with a **slight 3/4 tilt** (ADR-0010): buildings and furniture show a
little of their front face, so taller objects visually overlap whatever is behind
them.

**Consequences that must be handled in code:**

- **Depth sorting.** Anything with height needs a `depth` derived from its
  y-position (roughly `depth = y`) so the player passes behind a house's lower
  edge and in front of its upper edge. Getting this wrong looks broken instantly.
- **Collision bodies are not sprite bounds.** A tilted house's sprite includes
  roof overhang that the player should walk behind, not collide with. Set explicit
  body sizes and offsets rather than accepting sprite bounds (see Milestone 4 risks).
- **Doorways need enough visual width** for a 16×24 player to look like it fits.

---

## Player

| Aspect | Decision |
| --- | --- |
| Representation | One sprite, 3/4-tilt top-down view (~16×24 footprint). **Confirmed.** |
| Spawn | Defined per map in map data (FR-018, FR-002). |
| Appearance | A generic cozy pixel character. A personal avatar is a later milestone (DW-B05). **Confirmed.** |
| Animation | Walk cycle per facing direction, playing only while moving. **Confirmed** (DW-019). |
| Other players visible | **Undecided** — deferred to the presence phase (FR-029). |

---

## Movement

- **Confirmed:** arrow keys **and** WASD (FR-003). Both are required, not optional.
- **Confirmed:** frame-rate independent, delta-time based (FR-004).
- **Confirmed:** diagonal movement normalized so diagonals are not faster (FR-005).
- **Confirmed:** facing direction is visible at all times (FR-009) — with a real
  sprite sheet this is the animation direction, not a marker.
- **Confirmed:** while the conversation sidebar is open, the player does **not**
  move; the DOM owns the keyboard and `Esc` closes the panel (DW-038, ADR-0013).

| Parameter | Value |
| --- | --- |
| Base speed | **Undecided** — a tile-relative constant, tuned by feel once the tile size is live |
| Run modifier | **Proposed:** hold Shift for a faster walk (DW-017, Low priority) |
| Acceleration / inertia | **Undecided** — start with instant velocity; add inertia only if it improves feel |
| Movement while a panel is open | **Confirmed:** disabled |

### Physics style

- **Proposed:** Phaser Arcade Physics — velocity, static bodies and collider
  registration with minimal ceremony, which matches this phase's scope.
- **Confirmed:** collision bodies are set explicitly (size + offset), not inherited
  from sprite dimensions.

---

## Collision

- **Confirmed:** the player cannot pass through solid obstacles — trees, fences,
  rocks (FR-006).
- **Confirmed:** the player cannot leave the world bounds (FR-007).
- **Confirmed:** house bodies block movement, but the door area must remain
  reachable. Collision must hold:
  - from all four sides of an obstacle,
  - while moving diagonally, including at corners,
  - at maximum speed if the run toggle is enabled,
  - along world edges and corners,
  - **inside interiors**, against walls and furniture (DW-053).

---

## Interaction zones, doors and prompts

Two different actions live on a dwelling, which is a deliberate design decision:

| Target | Zone | Prompt | Action |
| --- | --- | --- | --- |
| **House** | Larger zone around the building | "Talk to *Contact* — `E`" | Opens the conversation sidebar (FR-023) |
| **Door** | Smaller zone at the doorway | "Enter — `E`" | Enters the shared interior (FR-030) |

- **Confirmed:** the door zone is **smaller** and **takes priority** where the two
  overlap, so standing in the doorway does not ambiguously offer two actions.
- **Confirmed:** approaching is required; nothing opens automatically (FR-012–FR-014).
- **Confirmed:** pressing `E` triggers the interaction for the **active** target
  only, and resolves to the correct contact (FR-015).
- **Confirmed:** leaving a zone clears the prompt (FR-016).
- **Confirmed:** `E` is the interact key, with `Space` as a documented fallback.
- **Confirmed:** the Altar shows **no** prompt — it is scenery this phase, and a
  prompt would falsely imply a working group space (FR-026, ADR-0015).

| Aspect | Decision |
| --- | --- |
| Zone shape | **Proposed:** rectangles over the footprint. |
| Overlapping dwellings | **Proposed:** resolve to a single nearest active target. |
| Prompt form | **Proposed:** in-world text near the target plus a highlight on the target. |
| Interacting outside a zone | Does nothing. **Confirmed.** |

**Requirement:** the prompt must name the *specific* contact or action, never a
generic "press E" (FR-013).

---

## Interiors

- **Confirmed:** the player can enter a dwelling and walk around inside (FR-030).
- **Confirmed:** the interior contains a **fireplace, a kitchen area, and a bed**
  (FR-031) — all recognisable, not implied.
- **Confirmed:** one **shared** interior template is used by every dwelling
  (ADR-0012). Personalised rooms are a later milestone (DW-B04).
- **Confirmed:** entering places the player just inside the door; exiting returns
  them to **the door of the dwelling they entered** (DW-054) — not a default spawn.
- **Confirmed:** no page reload occurs when moving between exterior and interior.
- **Proposed:** the interior is loaded as a room in the **same scene**, reusing the
  exterior map format where possible (DW-050), rather than a scene per room.
- **Proposed:** interior lighting is warm, matching the cozy direction — lantern
  light, wood tones.

```text
        EXTERIOR                        INTERIOR (shared template)
   ┌──────────────────┐             ┌──────────────────────────┐
   │   🏠 house       │             │  ▓▓▓▓ wall ▓▓▓▓▓▓▓▓▓▓▓▓  │
   │      ▭ door ─────┼── enter ───▶│  🔥 fireplace   🛏 bed   │
   │   🧍 player      │             │  🍳 kitchen      🧍       │
   └──────────────────┘◀── exit ────│      🚪 door             │
                                    └──────────────────────────┘
```

**Undecided:** interior dimensions, exact furniture arrangement, and whether the
interior has a window showing the exterior.

---

## Altar

- **Confirmed:** the Altar is rendered in the world as a **visually distinct**
  gathering location, and its position comes from map data (FR-026, DW-056).
- **Confirmed:** it is **scenery only** this phase — no interaction, no prompt
  (ADR-0015).
- **Proposed:** its silhouette (a stone platform with a brazier) should read as a
  landmark from across the map, clearly different from a dwelling.
- **Deferred:** group interaction at the Altar (FR-027, DW-B03).

---

## Camera

- **Confirmed:** the camera follows the player (FR-008).
- **Confirmed:** the camera is clamped to the map bounds — no area outside the map
  is ever visible (FR-008).
- **Proposed:** follow with slight smoothing; fall back to rigid follow if
  smoothing fights the bounds clamp at map edges.
- **Undecided:** dead zone and lead distance. Not needed for this phase.

---

## World boundaries and dimensions

- **Confirmed:** the world has finite dimensions used for both physics bounds and
  camera bounds (FR-007, FR-008).
- **Confirmed:** dimensions and tile size are defined **once** as constants
  (FR-018) — 16×16 tiles (ADR-0010).
- **Undecided:** map size in tiles (approximately 30×20 to 40×25 is the working
  range), and the visual treatment of the boundary (invisible wall versus a
  fence/hedge or treeline).

---

## Ground and environment

- **Confirmed:** a tiled ground layer covers the world, from a real tileset
  (FR-001, DW-009).
- **Confirmed:** props (trees, fences, rocks, signs, paths) provide scenery and
  obstacles (DW-020).
- **Proposed:** grass with dirt paths connecting dwellings, so paths guide the
  player toward places worth visiting.

---

## Confirmed vs. undecided summary

| Area | Confirmed | Undecided |
| --- | --- | --- |
| Perspective | 3/4 tilt, pixel art, cozy palette | — |
| World | Canvas rendering, finite bounds, alphabet maps, second map | Map size, boundary visuals |
| Player | One character, generic design, walk animation, defined spawn | Presence of other players |
| Movement | Arrows + WASD, delta-time, normalized diagonals, paused when panel open | Speed values, inertia, run toggle |
| Collision | Obstacles and edges solid; explicit bodies; interiors collide | Exact body sizes |
| Interaction | House zone + smaller door zone, `E` to act, prompt, correct contact | Zone rectangle sizes |
| Interiors | Shared template, fireplace/kitchen/bed, return to the entered door | Room size, furniture layout, window |
| Altar | Visible, distinct, from map data, non-interactive | Whether it ever becomes interactive |
| Camera | Follows player, clamped to world | Dead zone, lead distance, smoothing |
| Input | DOM owns keyboard while the sidebar is open | — |

## Related

- [`maps.md`](maps.md) — how maps and rooms are organized and loaded
- [`ui-ux.md`](ui-ux.md) — the canvas/DOM split and the conversation sidebar
- [`assets.md`](assets.md) — the art this design depends on
- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0010, ADR-0012, ADR-0013, ADR-0015
- [`../project/requirements.md`](../project/requirements.md) — FR-001 to FR-016, FR-030, FR-031
