# Asset Credits

Third-party assets used by Dwelling. Every file under `public/assets/` that did
not originate in this repository must be listed here with its pack, author,
license and source. Licenses were checked at the source pages on **2026-10-17**.

---

## Kenney Tiny Town

- **Pack:** Tiny Town
- **Author:** Kenney (Kenney.nl)
- **License:** CC0 1.0 Universal (Public Domain Dedication) —
  <https://creativecommons.org/publicdomain/zero/1.0/>
- **Source pages:**
  - <https://kenney.nl/assets/tiny-town>
  - <https://opengameart.org/content/tiny-town>
- **Downloaded from:** <https://opengameart.org/sites/default/files/kenney_tiny-town.zip>
- **Archive SHA-256:** `9768692dccff1d706408a5aedd6ca4f6cd1409506cbc84cb2f862919764be977`
- **Files used:**
  - `tilesets/tiny-town.png` — the pack's `Tilemap/tilemap_packed.png`
    (192×176, 12×11 tiles of 16×16, no spacing). SHA-256
    `3a54d99ecde790d4fdea207a3644cf130fc56fa838f1beb1507c185a95b8e902`
- **Used for:** ground layer (tile index 0 = plain grass) and, in later
  milestones, house exteriors, trees and props sliced from the same sheet.
- **Attribution note:** Kenney requests credit ("Kenney.nl") but does not require
  it under CC0. Recorded here regardless.

---

## Kenney Tiny Dungeon

- **Pack:** Tiny Dungeon
- **Author:** Kenney (Kenney.nl)
- **License:** CC0 1.0 Universal (Public Domain Dedication) —
  <https://creativecommons.org/publicdomain/zero/1.0/>
- **Source pages:**
  - <https://kenney.nl/assets/tiny-dungeon>
  - <https://opengameart.org/content/tiny-dungeon>
- **Downloaded from:** <https://opengameart.org/sites/default/files/kenney_tinydungeon.zip>
- **Archive SHA-256:** `c109438ab06f65fd80f9b2686a4cf9c7c11dc64444b47333ec71d602f8bb5fc7`
- **Files used:**
  - `tilesets/tiny-dungeon.png` — the pack's `Tilemap/tilemap_packed.png`
    (192×176, 12×11 tiles of 16×16, no spacing). SHA-256
    `d24e60a41e4ac7a745c0304dfde121143688557f40215f23221c29cfe683825f`
- **Used for:** interior furniture and furnishings (Milestone 8). Loaded as an
  *optional* asset — the world renders even if it is absent.
- **Attribution note:** same as above.

---

## Adding a new asset pack

1. Confirm the license at the **original source page** — do not assume a site's
   assets are CC0.
2. Download and record: pack name, author, license (with URL), source URL, the
   archive SHA-256, and the exact files copied.
3. Copy only the files you actually use into the matching
   `public/assets/<category>/` folder.
4. Add an entry for the pack above with the reason it is used.
5. Register the file in `src/world/assets.js`.

## Original project art

- **File:** `characters/player-walk.png`
- **Description:** 4-direction, 3-frame walk sprite sheet for the player entity
- **Created:** 2026-10-17 via Python script (`zlib` + `struct`, no image editor dependencies)
- **License:** Original to the Dwelling project
- **License:** Listed for completeness and provenanceility record in CREDITS.md per NFR-014
- **Size:** 64×72 pixels, 12 frames (4 directions × 3 frames), 16×24px per frame
- **Used by:** `frontend/src/world/entities/Player.js` for walk animations

---

## Kenney Tiny Town

- **Pack:** Tiny Town
- **Author:** Kenney (Kenney.nl)
- **b:** CC0 1.0 Universal (Public Domainbication) —
  <https://creativecommons.org/publicdomain/zero/1.0/>
- **Source pages:**
  - <https://kenney.nl/assets/tiny-town>
  - <https://opengameart.org/content/tiny-town>
- **Downloaded from:** <https://opengameart.org/sites/default/files/kenney_tiny-town.zip>
- **Archive SHA-256:** `9768692dccff1d706408a5aedd6ca4f6cd1409506cbc84cb2f862919764be977`
- **Files used:**
  - `bets/tiny-town.png` — the pack's `Tilemap/tilemap_png`
    (192×176, 12×11 tiles of 16×16, no spacing). SHA-256
    `3a54d99ecde790d4fdea207a3644cf130fc56fa838f1beb1507c185a95b8e902`
- **Used for:** ground layer (tile index 0 = plain grass) and, in later
  milestones, house exteriors, trees and props from the same sheet.
- **Attribution note:** Kenney requests credit ("Kenney.nl") but does not require
  it under CC0. Recorded here regardless.

---

## Kenney Tiny Dungeon

- **Pack:** Tiny Dungeon
- **Author:** Kenney (Kenney.nl)
- **b:** CC0 1.0 Universal (Public Domainbication) —
  <https://creativecommons.org/publicdomain/zero/1.0/>
- **Source pages:**
  - <https://kenney.nl/assets/tiny-dungeon>
  - <https://opengameart.org/content/tiny-dungeon>
- **Downloaded from:** <https://opengameart.org/sites/default/files/kenney_tinydungeon.zip>
- **Archive SHA-256:** `c109438ab06f65fd80f9b2686a4cf9c7c11dc64444b47333ec71d602f8bb5fc7`
- **Files used:**
  - `bets/tiny-dungeon.png` — the pack's `Tilemap/tilemap_png`
    (192×176, 12×11 tiles of 16×16, no spacing). SHA-256
    `d24e60a41e4ac7a745c0304dfde121143688557f40215f23221c29cfe683825f`
- **Used for:** interior furniture and furnishings (Milestone 8). Loaded as an
  *optional* asset — the world renders even if it is absent.
- **Attribution note:** same as above.

---

## Adding a new asset pack

1. Confirm the license at the **original source page** — do not assume a site's
   assets are CC0.
2. Download and record: pack name, author, license (with URL), source URL, the
   archive SHA-256, and the exact files copied.
3. Copy only the files you actually use into the matching
   `public/assets/<category>/` folder.
4. Add an entry for the pack above with the reason it is used.
5. Register the file in `src/world/assets.js`.
