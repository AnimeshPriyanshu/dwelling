/**
 * World constants.
 *
 * Sizes live here once so the physics world bounds, the camera bounds and the
 * ground layer can never drift apart. Scenes import these; they must not
 * hard-code dimensions.
 */

// One tile, in pixels. Kenney Tiny Town / Tiny Dungeon tiles are 16x16.
export const TILE_SIZE = 16

// World size, in tiles.
export const WORLD_TILES_X = 60
export const WORLD_TILES_Y = 40

// World size, in pixels — derived, never re-typed elsewhere.
export const WORLD_WIDTH = TILE_SIZE * WORLD_TILES_X
export const WORLD_HEIGHT = TILE_SIZE * WORLD_TILES_Y

// Canvas / camera viewport size, in pixels.
export const VIEW_WIDTH = 800
export const VIEW_HEIGHT = 400

// Tile frame used for the ground fill. Index 0 is plain grass in tiny-town.png.
export const GROUND_TILE_INDEX = 0
