/**
 * The single place that knows about asset files.
 *
 * - `TEXTURES`       texture keys referenced by scenes.
 * - `ASSET_PATHS`    file locations served from `frontend/public`.
 * - `ASSET_MANIFEST` declarative list consumed by `PreloadScene`.
 *
 * Assets come from the two packs supplied in the repository root (Sunnyside
 * World and Sprout Lands). Processed copies live beside their originals in
 * `public/assets/`; the pack folders are never rewritten. Provenance and
 * licences are recorded in `public/assets/CREDITS.md`.
 *
 * To add an asset: drop the file under `public/assets/<category>/`, add a key
 * to `TEXTURES`, a path to `ASSET_PATHS`, and an entry to `ASSET_MANIFEST`.
 * Never hard-code a file path inside a scene.
 */

/** @type {Record<string, string>} */
export const TEXTURES = {
  worldTiles: 'sunnyside-world',
  pathTiles: 'sprout-dirt',
  playerWalk: 'player-sprout',
  cottageBlue: 'cottage-blue',
  cottageGreen: 'cottage-green',
  cottageOrange: 'cottage-orange',
  cottageRed: 'cottage-red',
  cottagePurple: 'cottage-purple',
  tree01: 'tree-01',
  tree02: 'tree-02',
  rock01: 'rock-01',
  rock02: 'rock-02',
  fences: 'fences',
  crops: 'sprout-crops',
  uiExpressionChat: 'ui-expression-chat',
}

/** @type {Record<string, string>} */
export const ASSET_PATHS = {
  worldTiles: 'assets/tilesets/sunnyside-world.png',
  pathTiles: 'assets/tilesets/sprout-dirt.png',
  playerWalk: 'assets/characters/player-sprout.png',
  cottageBlue: 'assets/houses/cottage-blue.png',
  cottageGreen: 'assets/houses/cottage-green.png',
  cottageOrange: 'assets/houses/cottage-orange.png',
  cottageRed: 'assets/houses/cottage-red.png',
  cottagePurple: 'assets/houses/cottage-purple.png',
  tree01: 'assets/props/tree-01.png',
  tree02: 'assets/props/tree-02.png',
  rock01: 'assets/props/rock-01.png',
  rock02: 'assets/props/rock-02.png',
  fences: 'assets/props/fences.png',
  crops: 'assets/props/crops.png',
  uiExpressionChat: 'assets/ui/expression-chat.png',
}

/**
 * Contact portraits for the React chat drawer.
 *
 * These are DOM `<img>` sources rather than Phaser textures, so they keep a
 * leading slash: the browser resolves them from `public/`, unlike the Phaser
 * paths above, which are relative to the game's base URL.
 */
export const AVATAR_URLS = {
  base: '/assets/ui/avatar-base.png',
  bowlhair: '/assets/ui/avatar-bowlhair.png',
  curlyhair: '/assets/ui/avatar-curlyhair.png',
  longhair: '/assets/ui/avatar-longhair.png',
  mophair: '/assets/ui/avatar-mophair.png',
  shorthair: '/assets/ui/avatar-shorthair.png',
  spikeyhair: '/assets/ui/avatar-spikeyhair.png',
}

/** The player sheet is a 4×4 grid of 48×48 frames (rows = down, up, left, right). */
export const PLAYER_FRAME = { width: 48, height: 48 }

/**
 * Cottage sprites are 32×56 crops from the Sunnyside tileset, upscaled 2× with
 * nearest-neighbour sampling so they read as full houses next to the player.
 * The pixel grid doubles; no other distortion is introduced.
 */
export const COTTAGE_FRAME = { width: 64, height: 112 }

/** The world tileset is 1024×1024 of 16×16 tiles, 64 per row. */
export const WORLD_TILESET_COLUMNS = 64

/**
 * Frames in the supplied Sprout Lands dirt sheet (176×112) that are fully
 * opaque fill, so paths tile without seams: one plain tile plus four distinct
 * speckle variants (verified by cropping each frame and checking alpha).
 */
export const PATH_TILE_FRAMES = [12, 55, 56, 67, 68]

/**
 * Frames in the same tilled-soil sheet that are plain, fully opaque fill, used
 * to lay a farm plot. They differ only in speckle, so a field has texture.
 */
export const SOIL_TILE_FRAMES = [55, 56, 57, 66, 67, 68]

/**
 * Fence frames (16×16) from the supplied Sprout Lands sheet: a left cap, a
 * repeating rail and a right cap, all drawn as horizontal fences. A quarter
 * turn makes them vertical, which keeps the post-and-rail pattern exact (the
 * sheet's own vertical column is a sparse post spacing that does not tile).
 */
export const FENCE_FRAMES = { left: 1, horizontal: 2, right: 3, verticalAngle: 90 }

/**
 * The crop sheet is 6×2 frames of 16×16. Column 0 is a seed packet and column 5
 * the harvested item; columns 1–4 are the four growth stages.
 */
export const CROP_ROWS = { wheat: 0, root: 1 }
export const CROP_STAGES = [1, 2, 3, 4]

/**
 * @typedef {Object} AssetEntry
 * @property {string} key         texture key
 * @property {string} path        file path under public/
 * @property {'image'|'spritesheet'} type
 * @property {boolean} required   a failed required asset is logged as an error
 * @property {number} [frameWidth]  spritesheet frame width, in pixels
 * @property {number} [frameHeight] spritesheet frame height, in pixels
 */ /** @type {AssetEntry[]} */ export const ASSET_MANIFEST = [
  {
    key: TEXTURES.worldTiles,
    path: ASSET_PATHS.worldTiles,
    type: 'spritesheet',
    frameWidth: 16,
    frameHeight: 16,
    required: true,
  },
  {
    key: TEXTURES.pathTiles,
    path: ASSET_PATHS.pathTiles,
    type: 'spritesheet',
    frameWidth: 16,
    frameHeight: 16,
    required: true,
  },
  {
    key: TEXTURES.playerWalk,
    path: ASSET_PATHS.playerWalk,
    type: 'spritesheet',
    frameWidth: PLAYER_FRAME.width,
    frameHeight: PLAYER_FRAME.height,
    required: true,
  },
  {
    key: TEXTURES.fences,
    path: ASSET_PATHS.fences,
    type: 'spritesheet',
    frameWidth: 16,
    frameHeight: 16,
    required: false,
  },
  { key: TEXTURES.cottageBlue, path: ASSET_PATHS.cottageBlue, type: 'image', required: true },
  { key: TEXTURES.cottageGreen, path: ASSET_PATHS.cottageGreen, type: 'image', required: true },
  { key: TEXTURES.cottageOrange, path: ASSET_PATHS.cottageOrange, type: 'image', required: true },
  { key: TEXTURES.cottageRed, path: ASSET_PATHS.cottageRed, type: 'image', required: true },
  { key: TEXTURES.cottagePurple, path: ASSET_PATHS.cottagePurple, type: 'image', required: true },
  { key: TEXTURES.tree01, path: ASSET_PATHS.tree01, type: 'image', required: false },
  { key: TEXTURES.tree02, path: ASSET_PATHS.tree02, type: 'image', required: false },
  { key: TEXTURES.rock01, path: ASSET_PATHS.rock01, type: 'image', required: false },
  { key: TEXTURES.rock02, path: ASSET_PATHS.rock02, type: 'image', required: false },
  {
    key: TEXTURES.crops,
    path: ASSET_PATHS.crops,
    type: 'spritesheet',
    frameWidth: 16,
    frameHeight: 16,
    required: false,
  },
  {
    key: TEXTURES.uiExpressionChat,
    path: ASSET_PATHS.uiExpressionChat,
    type: 'image',
    required: false,
  },
]

/** @param {Phaser.Scene} scene */
export function loadAssets(scene) {
  for (const asset of ASSET_MANIFEST) {
    if (asset.type === 'spritesheet') {
      scene.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      })
    } else {
      scene.load.image(asset.key, asset.path)
    }
  }
}

/** @param {string} key */
export function getAsset(key) {
  return ASSET_MANIFEST.find((asset) => asset.key === key)
}
