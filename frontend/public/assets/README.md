# Game Assets

Static files served by Vite at `/assets/…`. These are loaded by Phaser through
`src/world/assets.js` — scenes never hard-code a path. All art comes from the
two supplied packs; see [`CREDITS.md`](CREDITS.md) and
[`../../../docs/design/asset-inventory.md`](../../../docs/design/asset-inventory.md).

## Layout

```text
public/assets/
├── README.md            this file
├── CREDITS.md           license + provenance for every third-party file
├── tilesets/            world tilesheets
│   ├── sunnyside-world.png    Sunnyside World 16 px tileset (1024×1024) — ground, terrain
│   ├── sprout-dirt.png        Sprout Lands dirt tiles (176×112) — roads and trails
│   ├── tiny-town.png          Kenney CC0 — legacy, no longer loaded
│   └── tiny-dungeon.png       Kenney CC0 — legacy, never loaded
├── characters/          character sheets
│   └── player-sprout.png      Sprout Lands 4×4 frames of 48×48 — the player
├── houses/              complete building sprites
│   └── cottage-*.png          five 64×112 cottages (2× crops) from the Sunnyside tileset
├── props/               individual props
│   ├── tree-01.png, tree-02.png, rock-01.png, rock-02.png
│   └── fences.png             Sprout Lands fence tiles (16×16)
├── ui/                  supplied UI art and portraits
│   ├── avatar-*.png           composited Sunnyside contact portraits (20×26)
│   └── expression-chat.png    Sunnyside UI icon (9×9)
└── interiors/           empty; furniture lands here in Milestone 8
```

## Conventions

- **Tilesets** are 16×16 tiles. The Sunnyside sheet is 64 tiles wide, no spacing,
  so tile index `65` is plain grass (row 1, column 1).
- **Sprite grids are explicit** in the manifest — never inferred by Phaser:
  player 48×48, world tiles 16×16, fences 16×16.
- **Naming:** lowercase, hyphenated, purpose-prefixed — `cottage-blue.png`, not
  `kenney-blue.png`. One logical asset per file, no version numbers.
- **Processed files keep their source in `CREDITS.md`** (exact crop rectangle or
  frame). Originals in the pack folders are never modified.
- **Sizes:** keep each raster file ≤ 512 KB (NFR-009); prefer PNG or WebP.
- **No stretching:** draw sprites at native pixel size.

## Adding an asset

1. Verify the licence at the original source and record it in `CREDITS.md`.
2. Drop the file in the matching category folder (processed copies separately
   from the original).
3. Add a texture key and path in `src/world/assets.js`, plus a manifest entry
   (`required: true` for assets the game needs; `required: false` for optional
   ones that may be missing).

## Credits

All third-party licensing and attribution lives in [`CREDITS.md`](CREDITS.md).
