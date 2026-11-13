# Asset Inventory and Integration Plan

Audit of the asset packs supplied in the repository root, and the plan for using
them in the Phaser world. **Nothing here is downloaded or generated art** — every
runtime file traces back to a supplied pack.

Audited by inspection on 2026-11-12, re-audited on 2026-11-13 (dimensions read
from the PNG headers, sprite grids verified by cropping and viewing, licence text
read from the packs and their source pages, verbatim copies checked by SHA-256).
The 2026-11-13 findings — including the integration problems and the explicit
MVP exclusion list — are in [section 9](#9-re-audit--2026-11-13).

---

## Supplied packs

| Pack | Author | Location | Licence |
| --- | --- | --- | --- |
| Sprout Lands – Sprites – Basic pack | Cup Nooble | `Sprout Lands - Sprites - Basic pack/` | Non-commercial use, modification allowed, **credit required**, pack may not be redistributed or resold. No NFTs, no AI training. |
| Sunnyside World V2.1 | Daniel Diggle | `Sunnyside_World_ASSET_PACK_V2.1/` | Free/commercial use, modification allowed, credit appreciated. Redistribution allowed as part of tutorials/educational courses **with a link to the itch.io page**. No repackaging/resale, no NFTs, no AI training. |

Both packs are **untracked** in git today. They are the primary visual source
from this point on; the earlier Kenney placeholder sheets are superseded (see
[`assets.md`](assets.md) and ADR-0019).

> **Licence caveat.** Sprout Lands is non-commercial and forbids redistributing
> the pack itself. This project is a non-commercial graded assignment, and the
> credit requirement is satisfied in
> [`frontend/public/assets/CREDITS.md`](../../frontend/public/assets/CREDITS.md).
> If the repository is published as a reusable asset source rather than a
> project, the Sprout Lands files must be removed or replaced. This caveat is
> carried into NFR-014.

---

## 1. Complete inventory

Paths are relative to each pack root. "Frames" means the sprite-sheet layout that
was verified by cropping, not an assumption.

### 1.1 Sprout Lands – Characters

| Asset | File path | Type | Dimensions / frames | Intended use |
| --- | --- | --- | --- | --- |
| Basic character walk sheet | `Characters/Basic Charakter Spritesheet.png` | Character spritesheet | 192×192 = 4×4 frames of **48×48**. Rows: **down, up, right, left**; 4 walk frames per row | **Player** (all four facings) |
| Character action sheet | `Characters/Basic Charakter Actions.png` | Character spritesheet | 96×576 = 2×12 frames of 48×48 | Not used this phase (watering/hoeing/axe actions) |
| Tools | `Characters/Tools.png` | Props sheet | 96×96 | Not used yet (tool icons/animations) |
| Chickens | `Characters/Free Chicken Sprites.png` | Character strip | 64×32 | Ambient animals (optional) |
| Cow | `Characters/Free Cow Sprites.png` | Character strip | 96×64 | Ambient animals (optional) |
| Egg and nest | `Characters/Egg_And_Nest.png` | Props strip | 64×16 | Not used |

### 1.2 Sprout Lands – Tilesets

| Asset | File path | Type | Dimensions / frames | Intended use |
| --- | --- | --- | --- | --- |
| Grass | `Tilesets/Grass.png` | Autotile sheet | 176×112 (11×7 tiles of 16) | Ground variants (fallback/decoration) |
| Hills | `Tilesets/Hills.png` | Autotile sheet | 176×144 | Not used this phase |
| Water | `Tilesets/Water.png` | Animated tiles | 64×16 (4×16 px frames) | Not used this phase |
| Fences | `Tilesets/Fences.png` | Tile sheet | 64×64 (4×4 tiles of 16) | **Farm rail** (posts, rails, caps + rotated side runs) |
| Doors | `Tilesets/Doors.png` | Tile strip | 16×64 | Reserved for interiors (M8) |
| Wooden house | `Tilesets/Wooden House.png` | Building kit | 112×80 | Alternative dwellings (not needed) |
| Roof tileset | `Tilesets/Wooden_House_Roof_Tilset.png` | Building kit | 112×80 | Modular roofs (not needed) |
| Wall tileset | `Tilesets/Wooden_House_Walls_Tilset.png` | Building kit | 80×48 | Modular walls (not needed) |
| Tilled dirt | `Tilesets/Tilled_Dirt_v2.png` (also `Tilled Dirt.png`, `_Wide`, `_Wide_v2`) | Tile sheet | 176×112 = 11×7 tiles of 16 | **Roads and trails** — opaque fill frames 12/56/67/68 (processed copy, tone-matched) |
| Bitmask references | `Tilesets/Bitmask references 1/2.png`, `.gif` | Reference only | 480×256 | **Documentation only — never loaded** |

### 1.3 Sprout Lands – Objects

| Asset | File path | Type | Dimensions | Intended use |
| --- | --- | --- | --- | --- |
| Furniture | `Objects/Basic_Furniture.png` (dup: `Basic Furniture.png`) | Props sheet | 144×96 | Interiors (M8) |
| Grass biome things | `Objects/Basic_Grass_Biom_things.png` (dup with spaces) | Props sheet | 144×80 | Ground decoration (available) |
| Plants | `Objects/Basic_Plants.png` (dup with spaces) | Props sheet | 96×32 | Crops/plants (available) |
| Tools and materials | `Objects/Basic_tools_and_meterials.png` (dup with spaces) | Props sheet | 48×32 | Not used |
| Chest | `Objects/Chest.png` | Animated props | 240×96 | Interiors/props (available) |
| Chicken house | `Objects/Free_Chicken_House.png` | Building | 48×48 | Ambient building (available) |
| Paths | `Objects/Paths.png` | Fence pieces | 64×64 | **Not paths** despite the filename — it is fence posts and rails. Left unused; `Tilesets/Tilled_Dirt_v2.png` is the actual path source |
| Wood bridge | `Objects/Wood_Bridge.png` (dup with spaces) | Building | 80×48 | Not used |
| Egg item | `Objects/Egg_item.png` (dup with spaces) | Item | 16×16 | Not used |
| Milk and grass item | `Objects/Simple_Milk_and_grass_item.png` (dup with spaces) | Items | 64×16 | Not used |
| Colour palette | `Sprout Lands color pallet/*` | Reference | varies | **Reference only** |

### 1.4 Sunnyside World – Tileset

| Asset | File path | Type | Dimensions / frames | Intended use |
| --- | --- | --- | --- | --- |
| World tileset | `Sunnyside_World_Assets/Tileset/spr_tileset_sunnysideworld_16px.png` | Tileset | **1024×1024 = 64×64 tiles of 16×16**, no spacing | **World ground** (grass frame `65`), terrain, rocks |
| Forest tileset | `Sunnyside_World_Assets/Tileset/spr_tileset_sunnysideworld_forest_32px.png` | Tileset | 320×576, 32 px tiles | Not used this phase (different tile grid) |
| Example scene | `Sunnyside_World_Assets/Sunnyside_World_ExampleScene.png` | Reference image | 4434×2470 | **Reference only — never loaded** |

### 1.5 Sunnyside World – Characters

| Asset | File path | Type | Dimensions / frames | Intended use |
| --- | --- | --- | --- | --- |
| Human action strips | `Sunnyside_World_Assets/Characters/Human/<ACTION>/<style>_<action>_stripN.png` | Character spritesheets | **96×64 per frame**; e.g. `IDLE` 9 frames (864×64), `WALKING`/`RUN` 8, `CARRY` 8, `ATTACK` 10, `DEATH` 13 | **Contact portraits** (processed from `IDLE` frame 0); body animations available |
| Goblin strips | `Characters/Goblin/PNG/*.png` + `GIF/*.gif` | Character spritesheets | same 96×64 grid | Available NPC/faction art (not used) |
| Skeleton strips | `Characters/Skeleton/PNG/*.png` + `GIF/*.gif` | Character spritesheets | same grid | Available NPC art (not used) |
| Source files | `Characters/_Source/*` | Layered source | — | **Not runtime** |
| Hair layers | `Characters/Human/IDLE/<hair>_idle_strip9.png` | **Layered overlays** | 96×64 frames | Composited over `base` for portraits |

> **Verified detail:** only `base_*` strips contain a body. `bowlhair`,
> `curlyhair`, `longhair`, `mophair`, `shorthair` and `spikeyhair` strips contain
> the **hair layer only** and must be composited over the base frame.

### 1.6 Sunnyside World – Elements

| Asset | File path | Type | Dimensions / frames | Intended use |
| --- | --- | --- | --- | --- |
| Trees | `Elements/Plants/spr_deco_tree_01_strip4.png` | Animated prop | 128×34 = 4 frames of **32×34** | **Obstacle tree** (frame 0) |
| Pines | `Elements/Plants/spr_deco_tree_02_strip4.png` | Animated prop | 112×43 = 4 frames of **28×43** | **Obstacle tree** (frame 0) |
| Mushrooms | `Elements/Plants/spr_deco_mushroom_*_strip4.png` | Animated props | 64×16 | Decoration (available) |
| Animals | `Elements/Animals/*.png` | Animated strips | bird/duck 64×16; chicken 128×32; cow/pig/sheep 128×32 | Ambient animals (available) |
| Crops | `Elements/Crops/*.png` (78 files) | **Harvested-produce icons** (verified: canvas sizes vary 4×4–16×16, one item per file, no growth sequence) | **Excluded** — not field plants. Farm crops use Sprout Lands `Objects/Basic_Plants.png` instead |
| Windmill | `Elements/Other/spr_deco_windmill_strip9.png` | Animated building | 1008×112 = 9 frames of 112×112 | Town landmark (available) |
| Fire / smoke / glint | `Elements/VFX/*` | Animated FX | varies | Ambient FX (available) |

### 1.7 Sunnyside World – UI

| Asset | File path | Type | Dimensions | Intended use |
| --- | --- | --- | --- | --- |
| Chat expression | `Sunnyside_World_Assets/UI/expression_chat.png` | Icon | 9×9 | Copied and loaded as `uiExpressionChat`, but **not yet drawn by any scene** |
| Expressions | `UI/expression_*.png` | Icons | 9×9 (some 9×8) | Contact status icons (available) |
| Bars | `UI/{red,green,blue}bar_*.png` | UI bars | 15×7 | Available |
| Labels | `UI/label_{left,middle,right}.png` | 9-slice label | 4×13 / 16×13 / 4×13 | Available |
| 9-slice boxes | `UI/9slice_box_white/{w,lt,dt}_box_9slice_*.png` | 9-slice panels | 3×3 pieces | Available (HTML/CSS owns the drawer today) |
| Cursors / select / icons | `UI/cursor_*.png`, `select_*`, tools, `search.png` | Icons | 5×6 to 18×19 | Available |
| Character portraits | derived from `Characters/Human/IDLE` | Processed | 20×26 crops | **Chat drawer avatar** |

### 1.8 Not assets / not runtime

- `Sunnyside_World_Gamemaker/**` — a full GameMaker project (duplicate sprites,
  rooms, options). Source project, **not** runtime input.
- `*.DS_Store` files in both packs.
- Sprout Lands duplicate files differing only by spaces vs underscores
  (`Basic Furniture.png` vs `Basic_Furniture.png`, etc.) — redundant copies.

---

## 2. Categorisation

**Usable immediately (copied verbatim into `public/assets/`)**

| Asset | Destination |
| --- | --- |
| Sunnyside 16px tileset | `assets/tilesets/sunnyside-world.png` |
| Sprout Lands character sheet | `assets/characters/player-sprout.png` |
| Sprout Lands fences | `assets/props/fences.png` |
| Sunnyside `expression_chat.png` | `assets/ui/expression-chat.png` |

**Needs configuration only (loaded as-is with explicit frame settings)**

| Asset | Configuration |
| --- | --- |
| `sunnyside-world.png` | spritesheet, 16×16 frames, 64 columns |
| `player-sprout.png` | spritesheet, 48×48 frames, 4 columns |
| `fences.png` | spritesheet, 16×16 frames, 4 columns (farm rail) |
| `sprout-dirt.png` | spritesheet, 16×16 frames, 11 columns; fill frames 12/56/67/68 (tone-matched copy) |

**Needs processing (processed copies created; originals untouched)**

| Asset | Processing | Result |
| --- | --- | --- |
| Sunnyside cottage facades | Cropped five complete 32×56 cottages from the tileset (`x=520`, `y=168/296/424/552/680`), then 2× nearest-neighbour to 64×112 | `assets/houses/cottage-{blue,green,orange,red,purple}.png` |
| Sunnyside trees | Frame 0 cropped from each 4-frame strip | `assets/props/tree-01.png` (32×34), `tree-02.png` (28×43) |
| Sunnyside rocks | 26×25 tiles cropped from the tileset | `assets/props/rock-01.png`, `rock-02.png` |
| Sunnyside human portraits | Base frame + hair layer composited, then 20×26 crop | `assets/ui/avatar-{base,bowlhair,curlyhair,longhair,mophair,shorthair,spikeyhair}.png` |
| Sprout Lands tilled dirt | Tone-matched to the Sunnyside grass palette, `colorchannelmixer=rr=0.82:gg=0.70:bb=0.58`; tile grid unchanged | `assets/tilesets/sprout-dirt.png` used by the path layer |

**Unsuitable or redundant**

- Sprout Lands `Bitmask references*` and colour-palette files — documentation.
- Sprout Lands duplicate space/underscore filenames — same image twice.
- Sunnyside GameMaker project, `_Source` folders, example scene, forest 32px
  tileset — reference or wrong grid.
- Sunnyside `IDLE/bowlhair_*` etc. — **not standalone characters**; overlay layers.
- Kenney `tiny-town.png` / `tiny-dungeon.png` — superseded placeholders; kept on
  disk but no longer loaded.

**Missing (genuinely required, not supplied)**

| Missing asset | Consequence | Proposed handling |
| --- | --- | --- |
| Sprout Lands **commercial-use** licence | Cannot ship commercially | Keep the project non-commercial, or swap the player sheet for a CC0/paid-commercial sheet |
| Sunnyside **4-direction** human walk | Player cannot use Sunnyside humans for all facings | Player uses Sprout Lands sheet (verified 4 directions) |
| Audio (music/SFX) | No sound | Out of scope (DW-B06) |
| Pixel font | HUD uses `system-ui` | Optional (DW-B09) |
| Standalone complete houses (non-modular) | Houses had to be cropped from the tileset | Crop once, store as processed PNGs (done) |
| Interior room tileset dedicated to rooms | Interiors not built yet | Use Sunnyside furniture + Sprout Lands furniture in M8 |

---

## 3. Asset-to-feature mapping

| Feature | Asset(s) | How it is used |
| --- | --- | --- |
| Player | Sprout Lands `Basic Charakter Spritesheet.png` | 48×48 frames, four directional walk animations, idle frame per direction |
| NPCs / contacts | Sunnyside `Human/IDLE` base + hair layers | **Portraits only** in the conversation drawer. Contacts do not walk the world (design decision), and Sunnyside has no 4-direction walk, so no world NPC sprites are drawn |
| World ground | Sunnyside 16px tileset, frame `65` | Phaser tilemap, one grass tile per map cell, world size derived from map data |
| Roads and trails | Sprout Lands `Tilled_Dirt_v2.png` fill tiles (processed) | Second tilemap layer above the grass; map data supplies the path rectangles |
| Dwellings | Sunnyside cottages (processed) | One 64×112 sprite per dwelling (2× the source crop), explicit collision body, click zone, prompt |
| Farms | Sprout Lands `Tilled_Dirt_v2.png` fill tiles, `Basic_Plants.png` growth stages, fence tiles | A fenced plot drawn as data: soil tile layer, one crop sprite per cell, rail fence with collidable bodies and a two-tile gate |
| Obstacles / scenery | Sunnyside `tree_01`, `tree_02`, rocks | Static obstacle sprites with explicit bodies |
| Furniture / interiors | Sunnyside furniture tiles + Sprout Lands `Basic_Furniture.png` | Reserved for Milestone 8 (interiors) |
| UI | Sunnyside `expression_chat.png` (icon) + portraits | Drawer avatars; the DOM keeps its own CSS panels |
| Ambient life | Sunnyside animals, windmill, VFX | Available; not placed this phase |
| Animation | Sprout Lands character sheet | `player-walk-{down,up,left,right}` at 8 FPS, repeat, idle on stop |

---

## 4. Recommended folder structure

Only files actually used are copied; originals stay untouched in the packs.

```
frontend/public/assets/
├── README.md
├── CREDITS.md                     provenance + licences (NFR-014)
├── tilesets/
│   ├── sunnyside-world.png        1024×1024, 16 px tiles   [supplied, verbatim]
│   ├── sprout-dirt.png            176×112, 16 px tiles     [processed: tone-matched]
│   ├── tiny-town.png              legacy placeholder, unused
│   └── tiny-dungeon.png           legacy placeholder, unused
├── characters/
│   ├── player-sprout.png          192×192, 48 px frames    [supplied, verbatim]
│   └── player-walk.png            legacy placeholder, unused
├── houses/
│   └── cottage-{blue,green,orange,red,purple}.png   64×112 [processed crop, 2×]
├── props/
│   ├── tree-01.png                32×34                    [processed]
│   ├── tree-02.png                28×43                    [processed]
│   ├── rock-01.png / rock-02.png  26×25                    [processed]
│   ├── fences.png                 64×64, 16 px frames      [supplied, verbatim]
│   └── crops.png                  96×32, 6×2 frames        [supplied, verbatim]
├── ui/
│   ├── expression-chat.png        9×9                      [supplied, verbatim]
│   └── avatar-<hair>.png          20×26                    [processed composite]
└── interiors/                     created empty for M8
```

Rules applied: no generated replacement art, originals preserved, processed
copies separate, no stretching (all sprites drawn at native pixel size).

---

## 5. Phaser loading strategy

- All keys, paths and manifest entries stay in
  [`frontend/src/world/assets.js`](../../frontend/src/world/assets.js). Scenes never
  contain a file path.
- `PreloadScene` loads the manifest, shows progress, then registers animations.
  `WorldScene` only references texture keys.
- Spritesheets declare their real grid:
  - Sunnyside world tileset — 16×16, 64 columns.
  - Sprout Lands player — 48×48, 4 columns.
  - Sprout Lands dirt — 16×16, 11 columns (path layer).
  - Fences — 16×16, 4 columns.
- Processed single-frame sprites (`houses/`, `props/`) load with `load.image`.
- Required vs optional is explicit. A missing required asset logs an error; a
  missing optional one warns. The world falls back to a flat ground fill rather
  than hanging.
- Pixel art renders with `pixelArt: true` so tiles stay crisp at the FIT scale.

---

## 6. Animation mapping

Verified sheet layout: frames are row-major, four per row.

| Direction | Row | Idle frame | Walk frames | Animation key |
| --- | --- | --- | --- | --- |
| down | 0 | 0 | 0–3 | `player-walk-down` |
| up | 1 | 4 | 4–7 | `player-walk-up` |
| right | 2 | 8 | 8–11 | `player-walk-right` |
| left | 3 | 12 | 12–15 | `player-walk-left` |

- Frame rate 8 FPS, `repeat: -1`, played only while moving.
- On stop the sprite is stopped and set to that direction's idle frame.
- Facing is updated from the movement vector; diagonals keep the last
  horizontal/vertical facing (left/right take precedence, as before).
- Collision body is 12×8 at offset (18, 36) of the 48×48 frame — feet only, so
  the character can walk behind roofs.
- Sunnyside contact strips (96×64) are **not** animated at runtime; only one
  composited frame becomes a portrait.

---

## 7. Missing asset report

Nothing required by the currently built features is missing. Specifically:

- Ground, player, dwellings, obstacles, portraits and a UI icon all resolve to
  supplied files.
- Interiors (Milestone 8) and the Altar (Milestone 9) have suitable supplied art
  available but are not built yet, so no asset is outstanding.
- Audio and a pixel font are absent from the packs and remain out of scope.
- The only commercial blocker is Sprout Lands' non-commercial licence; the
  Sunnyside pack is usable commercially.

---

## 8. Implementation plan

1. Copy the four verbatim files and create the processed crops (done — assets are
   in `frontend/public/assets/`).
2. Rewrite `world/assets.js` with the new manifest and keys (done).
3. Register the four player walk animations in `PreloadScene` (done).
4. Update `Player` to the 48×48 sheet: frame mapping, body, depth (done).
5. Change the map format from tile-index houses to sprite-key houses, and from
   tile-index obstacles to sprite keys with optional frames (done).
6. Author `a-c` and `s-u` with cottages, trees and rocks on Sunnyside grass
   (done).
7. Render the Sunnyside tileset as ground and depth-sort world objects by their
   base (done).
8. Show contact portraits in the conversation drawer (done).
9. Verify: build passes, every texture resolves, four facings animate, tiles
   have no gaps, collisions match visuals, map switching still works.

Implementation order follows the existing milestone structure: asset plumbing
before map data, map data before scene rendering, scene rendering before UI.

---

## 9. Re-audit — 2026-11-13

Scope: confirm the recorded facts still hold, find integration defects, and state
explicitly what is **not** carried into the MVP. Code was read, not changed.

### 9.1 How each claim was checked

| Claim | Method | Result |
| --- | --- | --- |
| Every runtime path resolves | Parsed `ASSET_PATHS` and `stat`-ed each file under `public/` | 15/15 present |
| “Copied verbatim” copies are unmodified | SHA-256 of project file vs pack original | `sunnyside-world.png`, `player-sprout.png`, `fences.png`, `crops.png`, `expression-chat.png` **identical**; `sprout-dirt.png` differs by design (tone map) |
| Sprite grids | Cropped strips with `ffmpeg`, viewed the crops | Confirmed below |
| Build/serve health | `npm run build` in `frontend/` | exit 0; only the pre-existing >500 kB chunk warning |
| Pack contents | Full `find` of both packs | 6,369 files (Sunnyside) + 43 (Sprout Lands); 11 `.DS_Store` in Sunnyside |

**Corrections to earlier notes** (verified this pass):

- Sprout Lands walk strips are named `<style>_walk_strip8.png` (not `_walking_`):
  768×64 = 8 frames of 96×64. Idle strips are `_idle_strip9.png`: 864×64 =
  9 frames.
- Sunnyside `WALKING` / `RUN` are a **single right-facing side view** (seen in the
  cropped frames), which confirms there is no four-direction human walk art.
- Sunnyside hair strips (`bowlhair_walk…`, etc.) contain hair only — no body.
- Sunnyside `Elements/Crops` are one produce item per file at varying canvas
  sizes (e.g. 6×6, 16×12, 12×14), i.e. **inventory icons**, not field crops.
- **Sunnyside ships no licence file.** Only Sprout Lands has `read_me.txt`. The
  Sunnyside terms are known only from the itch.io page recorded in `CREDITS.md`,
  so that URL is the provenance of record.

### 9.2 Integration problems found

Ordered by how likely they are to hurt.

| # | Problem | Impact | Minimal fix |
| --- | --- | --- | --- |
| P1 | Neither pack folder is gitignored; both show as untracked in `git status`. A `git add .` would stage **6,412 files / ≈31 MB**, including the 26 MB GameMaker project, 11 `.DS_Store` files, and Sprout Lands files whose licence forbids redistributing the pack. | Licence + repository-size hazard; directly contradicts the checklist in [`assets.md`](assets.md#licensing-checklist-before-any-asset-is-committed) | Add `Sunnyside_World_ASSET_PACK_V2.1/` and `Sprout Lands - Sprites - Basic pack/` to `.gitignore`; the folders stay on disk for the grader |
| P2 | `PATH_TILE_FRAMES = [12, 56, 56, 67, 68]` lists frame `56` twice. | Only four distinct path tiles are used, and the duplicate skews the hash distribution toward 56 — a subtle repeat pattern on every road. `CREDITS.md` documents 12/56/67/68. | Use `[12, 55, 56, 67, 68]` (55 is also opaque fill) or drop the duplicate |
| P3 | `uiExpressionChat` is loaded into Phaser but no scene references it. | A dead manifest entry: costs a request, and the “chat” icon never appears in the world | Either draw it (chat affordance) or delete the key/path/manifest entry |
| P4 | Six contact portraits are hard-coded URLs in `frontend/src/App.jsx` (`/assets/ui/avatar-curlyhair.png` …), bypassing the “keys declared once in `assets.js`” rule. | Renaming or moving a portrait requires editing React instead of the asset module; the UI set is invisible to the manifest check | Export an `AVATARS` map (contact id → path) from `world/assets.js` and import it in `App.jsx` (DOM images, so no Phaser manifest entry needed) |
| P5 | `CREDITS.md` still says fences are “reserved for obstacle runs; none are placed yet”. | Provenance doc is factually stale now that farms place the rail | Update that line; mention the farm use of the dirt sheet too |
| P6 | Kenney `tiny-town.png`, `tiny-dungeon.png` and `characters/player-walk.png` are tracked and shipped but never referenced. | ≈22 KB dead weight in `public/`, and a reviewer may think Kenney art is still in use | Remove in a separate chore change, after confirming no doc screenshots depend on them |
| P7 | `frontend/src/assets/` still holds Vite starter leftovers (`hero.png`, `javascript.svg`, `vite.svg`). | Confusing third image location, nothing imports it | Delete the folder |
| P8 | `Dwelling` creates its invisible collider sprite from `TEXTURES.worldTiles` frame 0. | Works today, but couples house physics to the terrain texture: swapping the ground sheet would silently remove house collision | Give the collider its own flat texture (a 1×1 `__WHITE`) or a `Physics.Arcade.StaticBody` directly |
| P9 | Cottages are 32×56 crops upscaled 2×, so houses have **2-px pixel density** while the world and player are 1 px. | Houses read larger (intended) but slightly “chunkier” than their surroundings at native zoom | Accepted trade-off, already recorded; no change proposed |

Nothing else is broken: 15/15 asset paths resolve, every manifest key has a
matching key constant, `pixelArt: true` is set, animations are registered once in
`PreloadScene`, and depth is consistent (ground 0 → paths/soil 1 → props sorted by
their base → player at `body.bottom`).

**Status (2026-11-13):** P1, P2, P4 and P5 are fixed. P3, P6, P7 and P8 remain
open by decision.

### 9.3 Not needed for the MVP — explicit exclusion list

Everything below is **intentionally left in the packs and not copied**.

| Asset | Where | Why it is out |
| --- | --- | --- |
| `Sunnyside_World_Gamemaker/**` | Sunnyside | GameMaker project: 26 MB of duplicated sprites, rooms and options. Source, never runtime |
| `Sunnyside_World_Assets/Sunnyside_World_ExampleScene.png` | Sunnyside | 4434×2470 reference image. Art direction only |
| `Characters/_Source/**` | Sunnyside | Layered `.aseprite`/source files |
| `Characters/Goblin/**`, `Characters/Skeleton/**` | Sunnyside | Faction art with no NPC role in the MVP. Available for later story content |
| `Characters/Human/{ATTACK,AXE,CARRY,CASTING,CAUGHT,DEATH,DIG,DOING,HAMMERING,HURT,JUMP,MINING,REELING,ROLL,SWIMMING,WAITING,WATERING}` | Sunnyside | Only `IDLE` is used, and only for portraits. Skills/combat are out of scope, and these strips are single-view like `WALKING` |
| `Tileset/spr_tileset_sunnysideworld_forest_32px.png` | Sunnyside | 32 px tiles: wrong grid for a 16 px world, and mixing would break tile alignment |
| `Elements/Crops/**` (78 files) | Sunnyside | Produce icons, not plantable field crops (see §9.1) |
| `Elements/Animals/**` | Sunnyside | Ambient only; no gameplay, and static chickens/cows would need wander AI to look alive |
| `Elements/Other/spr_deco_windmill_strip9.png` | Sunnyside | 112×112 landmark prop; no town district large enough for it yet |
| `Elements/VFX/**` | Sunnyside | Fire/smoke/glint; nothing in the world emits them |
| `Elements/Plants/spr_deco_mushroom_*.png` | Sunnyside | Decoration; grass scatter already reads as full |
| `UI/9slice_box_white/**`, `UI/label_*`, `UI/{red,green,blue}bar_*`, `UI/arrow_*`, `UI/cursor_*`, `UI/{confirm,cancel,search}.png` | Sunnyside | The HUD/drawer is DOM + CSS; Phaser draws no panels, so 9-slice kits and bars are unused |
| `UI/expression_*.png` (status icons) | Sunnyside | Contacts have no presence/status model yet. Only `expression_chat.png` was taken, and even it is unplaced (P3) |
| `Tilesets/{Hills,Water}.png`, `Doors.png`, `Wooden House*.png` | Sprout Lands | Hills/water tiles clash with the Sunnyside ground; doors and the wooden house are for interiors (M8) |
| `Objects/{Basic_Furniture,Basic_Grass_Biom_things,Basic_tools_and_meterials,Chest,Free_Chicken_House,Wood_Bridge,Egg_item,Simple_Milk_and_grass_item}.png` | Sprout Lands | Interiors (M8) or ambient decor; no interior rooms exist yet |
| `Objects/Paths.png` | Sprout Lands | Misnamed: fence posts/rails, not paths. `Tilesets/Fences.png` is the rail source, so this file is redundant |
| `Objects/*.png` space-named duplicates, e.g. `Basic Plants.png` | Sprout Lands | Byte-identical duplicates of the underscore versions. Zero value, ambiguity risk |
| `Sprout Lands color pallet/**`, `Tilesets/Bitmask references*` | Sprout Lands | Reference material for authoring, never loaded |
| `Tilesets/tiny-town.png`, `Tilesets/tiny-dungeon.png`, `characters/player-walk.png` | in project | Kenney/early placeholders, superseded and unreferenced (P6) |
| Audio, pixel font | neither pack | Not supplied; out of scope (DW-B06, DW-B09) |

### 9.4 Recommended order of minimal changes

1. **P1** — ignore the two pack folders (licence hygiene, one line each).
2. **P2** — fix the duplicated path frame (one-line correctness bug).
3. **P5** — refresh the stale fence sentence in `CREDITS.md`.
4. **P3**, **P4** — either place the chat icon or drop it; move portrait paths into `assets.js`.
5. **P6**, **P7** — delete the unused placeholders and Vite leftovers in a separate chore change.
6. **P8** — decouple the dwelling collider from the terrain texture when interiors start (M8).

### 9.5 Verification commands

```bash
# asset paths resolve and the game still builds
cd frontend && npm run build

# run it
cd frontend && npx vite --port 5199 --strictPort   # → http://localhost:5199

# every path in assets.js exists on disk
cd frontend && node -e "const fs=require('fs');const s=fs.readFileSync('src/world/assets.js','utf8');const p=[...new Set([...s.matchAll(/'(assets\/[^']+)'/g)].map(m=>m[1]))];console.log(p.filter(x=>!fs.existsSync('public/'+x)))"

# verbatim copies still match the packs (empty output = all identical)
for f in "Sprout Lands - Sprites - Basic pack/Characters/Basic Charakter Spritesheet.png"; do shasum -a 256 "$f"; done

# confirm the packs are ignored once P1 is applied
git check-ignore -v "Sprout Lands - Sprites - Basic pack" Sunnyside_World_ASSET_PACK_V2.1
```

---

## Related

- [`assets.md`](assets.md) — where assets live and the naming rules
- [`../../frontend/public/assets/CREDITS.md`](../../frontend/public/assets/CREDITS.md) — provenance
- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0019
- [`game-world.md`](game-world.md) — what the art has to depict
