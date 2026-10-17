# Assets

Where game and UI assets live, how they are named, where they come from, and how
the code references them.

> **Reality check:** Dwelling currently has **no game assets**. The only files
> present are the project's favicon/icon set and three unused leftovers from the
> Vite starter template. Nothing below exists yet — it is the agreed plan
> (ADR-0011), not a description of the repository.

---

## What actually exists today

Verified by inspecting `frontend/`:

| Path | What it is | Used? |
| --- | --- | --- |
| `frontend/public/favicon.svg` | Site favicon | Referenced from `index.html` as `/favicon.svg` |
| `frontend/public/icons.svg` | SVG icon sprite | Referenced from `index.html` as `/icons.svg` |
| `frontend/src/assets/hero.png` | Vite starter template image | **Not imported anywhere** |
| `frontend/src/assets/javascript.svg` | Vite starter template image | **Not imported anywhere** |
| `frontend/src/assets/vite.svg` | Vite starter template image | **Not imported anywhere** |
| `frontend/public/assets/` | — | **Does not exist yet** (created in DW-011) |

There is **no tileset, character sprite sheet, house sprite, furniture, prop, UI
image, font, or audio file** in the repository.

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
`frontend/public/`:

```text
assets/
├── CREDITS.md      every third-party file: pack, author, license, URL (NFR-014)
├── tiles/          ground tileset(s) and their tile data
├── houses/         dwelling exteriors + door
├── interiors/      the shared room layout + its furniture
├── props/          trees, bushes, rocks, fences, signs, paths
├── characters/     the player sprite sheet
├── altar/          code-authored Altar art
└── ui/             interact prompt + HUD icons
```

| Folder | Contents | Source | Used by |
| --- | --- | --- | --- |
| `tiles/` | Seamless 16×16 ground tiles | CC0 pack | DW-009 |
| `houses/` | 3–4 house variants + door tile, 3/4 tilt | CC0 pack | DW-026 |
| `interiors/` | Fireplace, kitchen counter, bed, table, rug, window + floor/wall tiles | CC0 pack | DW-051 |
| `props/` | Trees, bushes, rocks, fences, signs, path pieces | CC0 pack | DW-020 |
| `characters/` | Player sheet, 4 directions × 2–4 walk frames | CC0 pack or authored | DW-047 |
| `altar/` | Altar landmark | **Code-authored** | DW-055 |
| `ui/` | Interact prompt, HUD icons, door/interior glyphs | **Code-authored** | DW-029, DW-037 |

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

**Undecided:** whether the ground tileset ships as a single image + tile data, or
as a Phaser tilemap JSON exported from Tiled. Decided in DW-046; recorded there
and in `decisions.md` if it proves hard to reverse.

---

## Where assets come from

### Third-party CC0 packs (tiles, houses, furniture, props)

Sourced in DW-044 under a hard rule:

1. **Prefer one pack family** so tiles, houses and furniture share a palette.
2. **Verify the license** permits use and redistribution before the file enters
   the repository. CC0 or equivalent only.
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
- **Undecided:** whether keys follow the folder structure mechanically or are
  hand-listed. Decided in DW-046.

---

## Licensing checklist (before any asset is committed)

- [ ] The license explicitly permits use **and redistribution**.
- [ ] `frontend/public/assets/CREDITS.md` records pack, author, license, URL and
      the files taken from it.
- [ ] No asset of unknown origin is present.
- [ ] Any required attribution text is present.
- [ ] Confirm the files are **not** gitignored, and that no secret-bearing file
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
