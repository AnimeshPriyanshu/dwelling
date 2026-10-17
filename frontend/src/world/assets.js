/**
 * The single place that knows about asset files.
 *
 * - `TEXTURES`       texture keys referenced by scenes.
 * - `ASSET_PATHS`    file locations served from `frontend/public`.
 * - `ASSET_MANIFEST` declarative list consumed by `PreloadScene`.
 *
 * To add an asset: drop the file under `public/assets/<category>/`, add a key
 * to `TEXTURES`, a path to `ASSET_PATHS`, and an entry to `ASSET_MANIFEST`.
 * Never hard-code a file path inside a scene.
 */

/** @type {Record<string, string>} */
export const TEXTURES = {
  tinyTown: 'tiny-town',
  tinyDungeon: 'tiny-dungeon',
  playerWalk: 'characters/player-walk',
}

/** @type {Record<string, string>} */
export const ASSET_PATHS = {
  tinyTown: 'assets/tilesets/tiny-town.png',
  tinyDungeon: 'assets/tilesets/tiny-dungeon.png',
  playerWalk: 'assets/characters/player-walk.png',
}

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
    key: TEXTURES.tinyTown,
    path: ASSET_PATHS.tinyTown,
    type: 'spritesheet',
    frameWidth: 16,
    frameHeight: 16,
    required: true,
  },
  {
    key: TEXTURES.tinyDungeon,
    path: ASSET_PATHS.tinyDungeon,
    type: 'spritesheet',
    frameWidth: 16,
    frameHeight: 16,
    required: false,
  },
  {
    key: TEXTURES.playerWalk,
    path: ASSET_PATHS.playerWalk,
    type: 'spritesheet',
    frameWidth: 16,
    frameHeight: 24,
    required: true,
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