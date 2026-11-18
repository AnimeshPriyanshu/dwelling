/**
 * Shared world constants.
 *
 * Tile size and viewport size are global. Map size, spawn, dwellings and
 * obstacles live in `world/maps/`, never here — a map cannot change the
 * meaning of a tile or the camera viewport.
 */

// One tile, in pixels. Kenney Tiny Town / Tiny Dungeon tiles are 16x16.
export const TILE_SIZE = 16

// Canvas / camera viewport size, in pixels.
export const VIEW_WIDTH = 800
export const VIEW_HEIGHT = 400

// Shared default ground frame: plain grass in the Sunnyside 16px tileset
// (row 1, column 1 of 64). Maps may override it with their own `groundTile`.
export const GROUND_TILE_INDEX = 65

// Grass frames used to break up a flat field: plain tiles from row 1 and
// lightly decorated tiles from row 2 of the supplied tileset. Only applied when
// a map uses the default grass; any other `groundTile` stays uniform.
export const GROUND_TILE_VARIANTS = [65, 65, 65, 65, 65, 65, 65, 65, 66, 129, 130]
