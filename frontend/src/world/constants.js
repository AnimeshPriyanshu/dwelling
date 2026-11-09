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

// Shared default ground frame (plain grass in tiny-town.png). Maps may override
// it with their own `groundTile` entry.
export const GROUND_TILE_INDEX = 0
