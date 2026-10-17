# Game Assets

Static files served by Vite at `/assets/…`. These are loaded by Phaser through
`src/world/assets.js` — scenes never hard-code a path.

## Layout

```text
public/assets/
├── README.md            this file
├── CREDITS.md           license + provenance for every third-party file
└── tilesets/            tiled sheets sliced into 16×16 tiles
    ├── tiny-town.png    Kenney Tiny Town  — ground, houses, props, trees
    └── tiny-dungeon.png Kenney Tiny Dungeon — interior furniture
```

Only folders that hold files are created. Add `characters/`, `houses/`, `props/`
or `furniture/` when there are dedicated (non-tileset) sprites to put in them —
do not add empty folders.

## Conventions

- **Tilesets** are 16×16 tiles. `tiny-town.png` and `tiny-dungeon.png` are the
  packed sheets (no spacing) so tiles align on a 16px grid.
- **Naming:** lowercase, hyphenated, pack-prefixed — `tiny-town.png`,
  `player-walk.png`. One file per sheet or sprite, no version numbers in names.
- **Sizes:** keep each raster file ≤ 512 KB (NFR-009); prefer PNG or WebP.

## Adding an asset

1. Verify the license at the original source and record it in `CREDITS.md`.
2. Drop the file in the matching category folder.
3. Add a texture key and path in `src/world/assets.js`, plus a manifest entry
   (`required: true` for assets the game needs; `required: false` for optional
   ones that may be missing).

## Credits

All third-party licensing and attribution lives in [`CREDITS.md`](CREDITS.md).
