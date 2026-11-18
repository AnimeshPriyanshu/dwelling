# Assets

Where game and UI assets live, how they are named, where they come from, and how
the code references them.

> **Reality check (2026-11-12):** the project now uses the two **supplied** packs
> — Sunnyside World (Daniel Diggle) and Sprout Lands Basic (Cup Nooble). They are
> copied into `frontend/public/assets/` and loaded through `src/world/assets.js`.
> The Kenney CC0 sheets are superseded and no longer loaded. The full audit and
> feature mapping live in [`asset-inventory.md`](asset-inventory.md); provenance
> and licences in [`../../frontend/public/assets/CREDITS.md`](../../frontend/public/assets/CREDITS.md).

---

## What actually exists today

Verified by inspecting `frontend/` and the supplied packs on 2026-11-12:

| Path | What it is | Used? |
| --- | --- | --- |
| `frontend/public/favicon.svg` | Site favicon | Referenced from `index.html` as `/favicon.svg` |
| `frontend/public/assets/tilesets/sunnyside-world.png` | Sunnyside World 16 px tileset, 1024×1024 | **World ground** (frame 65) |
| `frontend/public/assets/tilesets/sprout-dirt.png` | Sprout Lands dirt tiles, 176×112, tone-matched | **Roads and trails** (path layer) |
| `frontend/public/assets/characters/player-sprout.png` | Sprout Lands character sheet, 4×4 frames of 48×48 | **Player**, four walk directions |
| `frontend/public/assets/houses/cottage-*.png` | Five cottages cropped from the Sunnyside tileset (32×56, upscaled 2× to 64×112) | **Dwellings** |
| `frontend/public/assets/props/tree-*.png`, `rock-*.png` | Sunnyside tree/rock crops | **Obstacles** |
| `frontend/public/assets/props/fences.png` | Sprout Lands fence tiles (16×16) | **Farm rail** (posts, rails, caps) |
| `frontend/public/assets/props/crops.png` | Sprout Lands plant sheet, 6×2 frames of 16×16 | **Farm crops** (wheat and root, four growth stages) |
| `frontend/public/assets/ui/avatar-*.png` | Composited Sunnyside contact portraits, 20×26 | **Chat drawer avatar** |
| `frontend/public/assets/ui/expression-chat.png` | Sunnyside UI icon, 9×9 | Loaded, reserved for UI |
| `frontend/public/assets/tilesets/tiny-town.png`, `tiny-dungeon.png` | Kenney CC0 sheets | **No longer loaded** (superseded) |
| `frontend/public/assets/characters/player-walk.png` | Early generated player sheet | **No longer loaded** |
| `frontend/public/assets/CREDITS.md` | Provenance and licences | Documentation |
| `frontend/src/assets/hero.png` etc. | Vite starter leftovers | **Not imported anywhere** |

No audio or font file exists in either pack; both remain out of scope. Interiors
are still unbuilt (Milestone 8) and use furniture tiles already available in the
Sunnyside tileset and Sprout Lands objects.

`frontend/dist/` is build output and is **not** a source of assets. It is
gitignored; treat anything in it as disposable.

### Tooling reality

This environment has **no image generator**: no Pillow, no ImageMagick, no
`sharp`/`canvas`/`pngjs`. Only `ffmpeg` and Python's `zlib` + `struct` are
available. Practical consequences:

- **Third-party CC0 packs** are the source for tiles, houses, props and furniture.
- **Code-authored art** is used for Dwelling-specific pieces. Python can write
  PNGs with no dependencies (`zlib` + `struct`), which suits exact-pixel art like
  the Altar at a fixed size.
- Generated or authored art must still be **explicitly sized, packed and
  licensed** before it is used — nothing is "just dropped in".

---

## The `public/` vs `src/assets/` distinction

Both can hold images, but they behave differently under Vite, and choosing wrong
causes confusing bugs:

| | `frontend/public/` | `frontend/src/assets/` |
| --- | --- | --- |
| Referenced by | Absolute URL path, e.g. `/assets/characters/player.png` | ES module import, e.g. `import hero from './assets/hero.png'` |
| Processed by the bundler | No — copied verbatim | Yes — hashed, optimized, emitted |
| Ideal for | Files loaded **by string path at runtime** (Phaser `load.image`/`load.spritesheet`) | Images imported by modules and used in markup/CSS |

**Rule for this project:** game assets that Phaser loads by path go under
**`frontend/public/assets/`**. That way the path in Phaser code
(`assets/characters/player.png`) matches the path in the repository, which is far
easier to reason about than hashed bundler output.

---

## Agreed folder layout

Created in DW-011 and populated in DW-044. Paths are relative to
`frontend/public/`. Only folders that hold a file are created — the narrower
categories below are added when they get their first file.

```text
assets/
├── README.md       layout, naming, how to add, ≤512 KB rule
├── CREDITS.md      every third-party file: pack, author, license, URL (NFR-014)
├── tilesets/       packed 16×16 sheets, sliced by tile index
│   ├── sunnyside-world.png   Sunnyside World — ground, terrain, props
│   └── sprout-dirt.png       Sprout Lands dirt — roads and trails
├── characters/
│   └── player-sprout.png     Sprout Lands — 4 directions × 4 frames
├── houses/
│   └── cottage-*.png         processed cottages from the Sunnyside sheet
├── props/
│   ├── tree-*.png, rock-*.png  processed Sunnyside props
│   ├── fences.png              Sprout Lands fence tiles
│   └── crops.png               Sprout Lands crop growth stages
├── interiors/      created for Milestone 8 furniture
└── ui/
    ├── avatar-*.png          composited contact portraits
    └── expression-chat.png   supplied UI icon
```

| Folder | Contents | Source | Status |
| --- | --- | --- | --- |
| `tilesets/` | 16×16 world tileset + dirt path sheet | Sunnyside World + Sprout Lands | ✅ integrated |
| `characters/` | Player sheet, 4 directions × 4 walk frames | Sprout Lands | ✅ integrated |
| `houses/` | Complete cottage sprites (processed crops) | Sunnyside World | ✅ integrated |
| `props/` | Trees, rocks, fences, crops (processed crops/sheets) | Sunnyside + Sprout Lands | ✅ integrated |
| `interiors/` | Interior furniture | Sunnyside + Sprout Lands | **planned** (DW-051) |
| `altar/` | Altar landmark | **Code-authored** | **planned** (DW-055) |
| `ui/` | Contact portraits, expression icon | Sunnyside World | ✅ avatars integrated |

### Documentation screenshots

Runtime assets and documentation images are kept apart:

- **Game assets** live in `frontend/public/assets/` and are loaded by the game at
  runtime.
- **Screenshots for the graded report** live in `docs/assets/`, created in DW-042,
  and are **never loaded by the game**.

This split keeps the shipped asset folder free of documentation files, and keeps
the screenshots beside the documents that reference them.

**Deliberately not included:**

- **Contact characters** — contacts do not move on screen, so they need no
  sprites this phase.
- **Audio** — no audio assets exist and none are being sourced (DW-B06).
- **Fonts** — the HUD uses `system-ui`. A pixel font is optional (DW-B09).
- **Anything decorative** with no task consuming it.

---

## Technical requirements

| Requirement | Value | Why |
| --- | --- | --- |
| Tile grid | **16×16** | The agreed art direction (ADR-0010); keeps the world math simple |
| Buildings | **32×32 to 64×48**, 3/4 tilt | Big enough to read as a house, small enough to place several |
| Player | ~16×24 footprint | Fits doorways and the 3/4-tilt perspective |
| Format | **PNG** (WebP acceptable for UI) | Transparency is required for sprites |
| Transparency | Required for sprites and props | Nothing should ship with a baked background |
| Max size | **≤ 512 KB per file** (NFR-009) | Keeps initial load under ~3s (NFR-006) |
| Sprite sheets | Even grid, no padding unless the format requires it | Phaser derives frames from a uniform grid |
| Colour | Consistent palette across all assets | The single biggest risk when mixing packs |

**Decided (DW-046):** tiles ship as **one packed PNG per pack**, sliced by tile
index; the ground layer's data array is built in code in `WorldScene`. No Tiled
exported JSON is used.

---

## Where assets come from

### Supplied packs (tiles, characters, houses, props, UI)

Both packs were supplied by the project owner. They are used as the primary
visual source; no replacement art is generated and no random download replaces a
suitable supplied file.

1. **Prefer one pack per role** so the palette stays coherent (Sunnyside for the
   world, Sprout Lands for the four-direction player).
2. **Verify the license** before a file enters the repository. Sunnyside permits
   commercial use; Sprout Lands is **non-commercial** with credit required.
3. **Record it in `CREDITS.md`** — pack name, author, license, source URL, and
   which files came from it.
4. **Check the tile size and grid** match the 16×16 grid; repack if not.
5. If nothing suitable is found within DW-044's hour, **fall back to code-authored
   placeholder tiles** and carry the search to Day 3. Do not burn the day.

### Code-authored art (Altar, HUD icons, fallbacks)

- Defined explicitly as pixel grids against the agreed palette, then written as
  PNGs by a small Python script (`zlib` + `struct`, no dependencies).
- Suited to hard-edged, geometric pieces — the Altar's stone platform and
  brazier, prompt glyphs, HUD icons.
- **Not suited to organic detail** (characters, foliage). Use packs for those.

`CREDITS.md` still lists code-authored art, marked as original to the project, so
the file is a complete provenance record for the graded report.

---

## Naming conventions

- **Lowercase, kebab-case, no spaces:** `player-walk.png`, not `Player Walk.PNG`.
- **Sprite sheets state the grid:** `player-walk-4x4.png` for 4 columns × 4 rows.
- **Variants use a suffix:** `house-a.png`, `house-b.png`.
- **States are words, not numbers:** `player-idle.png`, `player-walk.png`.
- **Prefix by purpose, not by pack:** `tile-grass.png`, not `kenney-grass.png`.
  Provenance belongs in `CREDITS.md`, not in every filename.
- **No version numbers or dates in filenames** — git history holds that.
- **One logical asset per file.** Do not pack unrelated sprites into one sheet.

### Referencing assets from code

- **Required:** asset keys are declared **once**, in `frontend/src/world/assets.js`,
  mapping a key (`player-walk`) to a single file path. Renaming a file becomes a
  one-line change.
- **Required:** assets load in `PreloadScene` (DW-012), not inside entity
  constructors — entities assume their texture key already exists.
- **Required:** a missing optional asset must degrade gracefully to a placeholder,
  not crash or blank the world.
- **Decided (DW-046):** keys are **hand-listed** in `world/assets.js` together
  with their paths and manifest entry. Scene code refers to the exported key
  constant, never a literal path.

---

## Licensing checklist (before any asset is committed)

- [x] The license explicitly permits use **and redistribution**. (Kenney packs are CC0.)
- [x] `frontend/public/assets/CREDITS.md` records pack, author, license, URL and
      the files taken from it.
- [x] No asset of unknown origin is present.
- [x] Any required attribution text is present. (CC0 needs none; credited anyway.)
- [x] Confirm the files are **not** gitignored, and that no secret-bearing file
      (`*.local`, `.env*`) came along with the download.

---

## What must never be committed

- Generated build output (`frontend/dist/`, `dist/` — already gitignored).
- `node_modules/`.
- Asset packs whose license does not permit redistribution. **If the origin
  cannot be stated, it does not belong in the repository.**
- Any file containing a credential, key, or environment-specific value
  (NFR-011) — including screenshots that happen to show an `.env` file.

## Related

- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0010 (art direction), ADR-0011 (sourcing)
- [`../planning/milestones.md`](../planning/milestones.md) — DW-044 – DW-047, DW-051, DW-055
- [`game-world.md`](game-world.md) — what the art has to depict
- [`../development/coding-conventions.md`](../development/coding-conventions.md) — how asset keys are written
- [`../project/requirements.md`](../project/requirements.md) — NFR-009, NFR-014
