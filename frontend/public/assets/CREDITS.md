# Asset Credits

Provenance for every third-party file under `public/assets/` (NFR-014). Files
that are processed copies record both the source pack and the transformation.

> **Licence summary**
>
> - **Sunnyside World** (Daniel Diggle) — free/commercial use, modification
>   allowed, credit appreciated. Redistribution is allowed as part of
>   educational material with a link to the itch.io page. No resale/repackaging,
>   no NFTs, no AI training.
> - **Sprout Lands Basic Pack** (Cup Nooble) — **non-commercial** use,
>   modification allowed, **credit required**. The pack may not be redistributed
>   or resold on its own. No NFTs, no AI training.
> - **Kenney Tiny Town / Tiny Dungeon** — CC0 1.0; no longer loaded (superseded).

---

## Sunnyside World V2.1

- **Pack:** Sunnyside World (V2.1)
- **Author:** Daniel Diggle (`@DanielDiggle`)
- **Licence:** Sunnyside World licence V1 — free and commercial use permitted;
  modification permitted; credit appreciated but not required; redistribution
  permitted as part of tutorials/educational courses **with a link** to
  <https://danieldiggle.itch.io/sunnyside>; no repackaging/resale; no NFTs; no AI
  training.
- **Source page:** <https://danieldiggle.itch.io/sunnyside>
- **Supplied location:** `Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets/`
- **Files copied verbatim:**
  - `tilesets/sunnyside-world.png` ← `Tileset/spr_tileset_sunnysideworld_16px.png`
    (1024×1024, 64×64 tiles of 16×16, no spacing)
  - `ui/expression-chat.png` ← `UI/expression_chat.png` (9×9)
- **Processed copies** (originals untouched; source pixel rectangles recorded):
  - `houses/cottage-blue.png` ← tileset crop 32×56 at (520, 168), then 2×
    nearest-neighbour to 64×112
  - `houses/cottage-green.png` ← tileset crop 32×56 at (520, 296), then 2× to
    64×112
  - `houses/cottage-orange.png` ← tileset crop 32×56 at (520, 424), then 2× to
    64×112
  - `houses/cottage-red.png` ← tileset crop 32×56 at (520, 552), then 2× to
    64×112
  - `houses/cottage-purple.png` ← tileset crop 32×56 at (520, 680), then 2× to
    64×112

    The upscale only doubles each pixel (no interpolation, no distortion) so the
    cottages read as full houses next to the player; the 1× crops are reproducible
    from the coordinates above.
  - `props/tree-01.png` ← `Elements/Plants/spr_deco_tree_01_strip4.png`, frame 0
    (32×34 crop at 0, 0)
  - `props/tree-02.png` ← `Elements/Plants/spr_deco_tree_02_strip4.png`, frame 0
    (28×43 crop at 0, 0)
  - `props/rock-01.png` ← tileset crop 26×25 at (787, 340)
  - `props/rock-02.png` ← tileset crop 26×25 at (787, 372)
  - `ui/avatar-base.png` ← `Characters/Human/IDLE/base_idle_strip9.png`, frame 0
    (20×26 crop at 38, 18)
  - `ui/avatar-{bowlhair,curlyhair,longhair,mophair,shorthair,spikeyhair}.png` ←
    the matching hair layer in `Characters/Human/IDLE/` composited over
    `base_idle_strip9.png`, frame 0, then the same 20×26 crop
- **Used for:** world ground, cottage dwellings, trees, rocks, contact portraits,
  chat icon. Furniture tiles are reserved for interiors (Milestone 8).

---

## Sprout Lands — Sprites — Basic pack

- **Pack:** Sprout Lands — Basic Pack
- **Author:** Cup Nooble
- **Licence (from `read_me.txt`):** may be modified; may be used in **any kind of
  non-commercial project**; the asset pack itself may not be redistributed or
  resold, even modified; NFTs and AI training are not allowed; **credit is
  required** ("Assets – From: Sprout Lands – By: Cup Nooble"). Projects made with
  the assets, including open-source projects, may be distributed with a note
  naming Cup Nooble and the licence terms.
- **Author links:** <https://cupnooble.itch.io/> · `cupnooble.carrd.co`
- **Supplied location:** `Sprout Lands - Sprites - Basic pack/`
- **Files copied verbatim:**
  - `characters/player-sprout.png` ← `Characters/Basic Charakter Spritesheet.png`
    (192×192, 4×4 frames of 48×48; rows = down, up, right, left)
  - `props/fences.png` ← `Tilesets/Fences.png` (64×64, 4×4 tiles of 16×16)
  - `props/crops.png` ← `Objects/Basic_Plants.png` (verbatim; 96×32, 6×2
    frames of 16×16: wheat and root crop growth stages)
- **Processed copies** (originals untouched):
  - `tilesets/sprout-dirt.png` ← `Tilesets/Tilled_Dirt_v2.png` (176×112, 11×7
    tiles of 16×16). Tone-matched to the Sunnyside grass palette with
    `colorchannelmixer=rr=0.82:gg=0.70:bb=0.58`; every other pixel and the tile
    grid are unchanged. The fully opaque fill tiles, verified by cropping each
    frame and checking alpha, are frames 12, 55, 56, 67 and 68: one plain tile
    and four distinct speckle variants. The path layer draws from those, and the
    farm soil layer uses the same sheet.
- **Used for:** the player character (four-facing walk animation), the dirt
  roads/trails rendered under the player, the farm plot soil (same sheet), the
  farm rail built from the fence tiles, and the crops on the farm plots.
- **Attribution:** Assets – From: Sprout Lands – By: Cup Nooble.

---

## Kenney Tiny Town (superseded)

- **Pack:** Tiny Town · **Author:** Kenney (Kenney.nl)
- **Licence:** CC0 1.0 Universal — <https://creativecommons.org/publicdomain/zero/1.0/>
- **Source:** <https://kenney.nl/assets/tiny-town> ·
  <https://opengameart.org/content/tiny-town>
- **Files:** `tilesets/tiny-town.png` (192×176)
- **Status:** previously used for ground, dwellings and obstacles. **No longer
  loaded** after the supplied packs were integrated. Kept on disk so the change
  is reversible; remove before release if unused.

---

## Kenney Tiny Dungeon (unused)

- **Pack:** Tiny Dungeon · **Author:** Kenney (Kenney.nl)
- **Licence:** CC0 1.0 Universal — <https://creativecommons.org/publicdomain/zero/1.0/>
- **Source:** <https://kenney.nl/assets/tiny-dungeon> ·
  <https://opengameart.org/content/tiny-dungeon>
- **Files:** `tilesets/tiny-dungeon.png` (192×176)
- **Status:** never loaded by any map; reserved originally for interiors.

---

## Adding a new asset

1. Confirm the licence at the **original source page**; record whether
   commercial use and redistribution are allowed.
2. Add the file under the matching `public/assets/<category>/` folder.
3. If it is processed, keep the original pack file untouched and record the exact
   crop/frame here.
4. Register it in `frontend/src/world/assets.js`.
5. Add an entry above with pack, author, licence, URL and files used.
