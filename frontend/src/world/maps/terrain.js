import { TILE_SIZE } from '../constants'
import { COTTAGE_FRAME } from '../assets'
import { isInsideFarm } from '../farm'

/**
 * Terrain helpers shared by every map.
 *
 * Maps describe roads and clearings as data; these functions turn that data
 * into (a) the tile grid the path layer renders and (b) the obstacle list that
 * fills the woods around it. Everything is derived from an integer seed, so a
 * map looks identical on every load without storing hundreds of coordinates.
 */

/** Collision footprints of the supplied tree sprites, in sprite pixels. */
export const TREE_PROPS = {
  'tree-01': { width: 10, height: 8, offsetX: 11, offsetY: 24 },
  'tree-02': { width: 10, height: 8, offsetX: 9, offsetY: 33 },
}

/** Collision footprints of the supplied rock sprites. */
export const ROCK_PROPS = {
  'rock-01': { width: 22, height: 14, offsetX: 2, offsetY: 9 },
  'rock-02': { width: 22, height: 14, offsetX: 2, offsetY: 9 },
}

const KEY = (column, row) => `${column},${row}`

/**
 * Deterministic 32-bit hash of a grid cell, used for scatter decisions.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @returns {number} 0 <= n < 1
 */
function noise(x, y, seed) {
  let hash = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)
  hash = Math.imul(hash ^ seed, 1274126177)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return (hash >>> 0) / 4294967296
}

/**
 * Rasterises `map.paths` (tile rectangles) into a set of occupied cells.
 *
 * @param {import('./format').PathConfig[]} paths
 * @param {number} columns
 * @param {number} rows
 * @returns {Set<string>} cells as `"column,row"`
 */
export function buildPathCells(paths, columns, rows) {
  const cells = new Set()
  for (const rect of paths ?? []) {
    const fromColumn = Math.max(0, rect.x)
    const toColumn = Math.min(columns, rect.x + rect.w)
    const fromRow = Math.max(0, rect.y)
    const toRow = Math.min(rows, rect.y + rect.h)
    for (let row = fromRow; row < toRow; row += 1) {
      for (let column = fromColumn; column < toColumn; column += 1) {
        cells.add(KEY(column, row))
      }
    }
  }
  return cells
}

/**
 * True when a world position is on a path or within `margin` tiles of one.
 *
 * @param {Set<string>} cells
 * @param {number} x world pixels
 * @param {number} y world pixels
 * @param {number} margin tiles
 */
export function isNearPath(cells, x, y, margin = 0) {
  const column = Math.floor(x / TILE_SIZE)
  const row = Math.floor(y / TILE_SIZE)
  for (let dr = -margin; dr <= margin; dr += 1) {
    for (let dc = -margin; dc <= margin; dc += 1) {
      if (cells.has(KEY(column + dc, row + dr))) return true
    }
  }
  return false
}

/**
 * Smooth 2D value noise, so the forest has soft clumps instead of an even
 * sprinkle of trees.
 *
 * @param {number} x world pixels
 * @param {number} y world pixels
 * @param {number} seed
 * @param {number} cell size of one noise cell, in pixels
 * @returns {number} 0 <= n <= 1
 */
function smoothNoise(x, y, seed, cell) {
  const gridX = x / cell
  const gridY = y / cell
  const x0 = Math.floor(gridX)
  const y0 = Math.floor(gridY)
  const fade = (t) => t * t * (3 - 2 * t)
  const tx = fade(gridX - x0)
  const ty = fade(gridY - y0)

  const a = noise(x0, y0, seed)
  const b = noise(x0 + 1, y0, seed)
  const c = noise(x0, y0 + 1, seed)
  const d = noise(x0 + 1, y0 + 1, seed)

  const top = a * (1 - tx) + b * tx
  const bottom = c * (1 - tx) + d * tx
  return top * (1 - ty) + bottom * ty
}

/** True when a world position falls inside any of the clearing circles. */
function isCleared(clearings, x, y) {
  return clearings.some((clearing) => {
    if (clearing.width !== undefined) {
      return (
        x >= clearing.x &&
        x <= clearing.x + clearing.width &&
        y >= clearing.y &&
        y <= clearing.y + clearing.height
      )
    }
    return Math.hypot(x - clearing.x, y - clearing.y) <= clearing.radius
  })
}

/**
 * Builds the clearings around the things a player must be able to see and
 * reach: buildings, the spawn point and the altar.
 *
 * @param {Object} options
 * @param {import('./format').DwellingConfig[]} options.dwellings
 * @param {import('./format').Point} options.spawn
 * @param {import('./format').Point|null} options.altar
 * @param {number} [options.spawnRadius] pixels
 * @param {number} [options.altarRadius] pixels
 * @returns {Array<{x:number,y:number,width:number,height:number}|{x:number,y:number,radius:number}>}
 */
export function buildClearings({
  dwellings,
  spawn,
  altar,
  spawnRadius = 56,
  altarRadius = 44,
}) {
  const clearings = dwellings.map((dwelling) => ({
    x: dwelling.x - COTTAGE_FRAME.width / 2 - 24,
    y: dwelling.y - COTTAGE_FRAME.height / 2 - 12,
    width: COTTAGE_FRAME.width + 48,
    height: COTTAGE_FRAME.height + 42,
  }))

  clearings.push({ x: spawn.x, y: spawn.y, radius: spawnRadius })
  if (altar) clearings.push({ x: altar.x, y: altar.y, radius: altarRadius })

  return clearings
}

/**
 * Scatters the forest around the paths and clearings.
 *
 * Trees are seeded on a jittered grid so the canopy overlaps naturally, then
 * kept out of roads, building clearings and the spawn area. Density rises away
 * from the roads, which keeps the village readable while the rest of the map
 * becomes real woodland.
 *
 * @param {Object} options
 * @param {import('./format').MapSize} options.size
 * @param {import('./format').PathConfig[]} [options.paths]
 * @param {import('./format').DwellingConfig[]} options.dwellings
 * @param {import('./format').Point} options.spawn
 * @param {import('./format').Point|null} options.altar
 * @param {import('./format').FarmConfig[]} [options.farms]
 * @param {number} options.seed
 * @param {number} [options.spacing] grid step in pixels
 * @param {number} [options.density] base chance per grid cell
 * @returns {import('./format').ObstacleConfig[]}
 */
export function scatterForest({
  size,
  paths = [],
  dwellings,
  spawn,
  altar,
  farms = [],
  seed,
  spacing = 24,
  density = 0.85,
}) {
  const width = size.columns * TILE_SIZE
  const height = size.rows * TILE_SIZE
  const pathCells = buildPathCells(paths, size.columns, size.rows)
  const clearings = buildClearings({ dwellings, spawn, altar })
  const rows = Math.ceil(height / spacing)
  const columns = Math.ceil(width / spacing)
  const obstacles = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      // Jitter keeps the grid from reading as an orchard.
      const x = Math.round(
        (column + 0.5) * spacing + (noise(column, row, seed) - 0.5) * spacing * 0.9
      )
      const y = Math.round(
        (row + 0.5) * spacing + (noise(column, row, seed + 101) - 0.5) * spacing * 0.9
      )

      if (x < 20 || y < 26 || x > width - 20 || y > height - 12) continue
      if (isCleared(clearings, x, y)) continue
      if (isNearPath(pathCells, x, y, 1)) continue
      // Keep a one-tile verge around a farm, so no canopy hangs over the rail.
      if (isInsideFarm(farms, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE), 1)) continue

      // Clump the trees: dense stands fade into small glades. Roads keep an
      // open verge so the village stays readable.
      const clump = smoothNoise(x, y, seed + 404, 72)
      const chance = isNearPath(pathCells, x, y, 3) ? 0.3 : density * (0.22 + 1.6 * clump)
      if (noise(column, row, seed + 202) > Math.min(chance, 0.97)) continue

      const typeRoll = noise(column, row, seed + 303)
      const sprite = typeRoll < 0.62 ? 'tree-01' : 'tree-02'
      obstacles.push({ x, y, sprite, ...TREE_PROPS[sprite] })
    }
  }

  return obstacles
}

/**
 * Scatters a few rocks in the open ground, never on a road or in a doorway.
 *
 * @param {Object} options
 * @param {import('./format').MapSize} options.size
 * @param {import('./format').PathConfig[]} [options.paths]
 * @param {import('./format').DwellingConfig[]} options.dwellings
 * @param {import('./format').Point} options.spawn
 * @param {import('./format').Point|null} [options.altar]
 * @param {import('./format').FarmConfig[]} [options.farms]
 * @param {number} options.seed
 * @param {number} [options.count]
 * @returns {import('./format').ObstacleConfig[]}
 */
export function scatterRocks({
  size,
  paths = [],
  dwellings,
  spawn,
  altar = null,
  farms = [],
  seed,
  count = 9,
}) {
  const width = size.columns * TILE_SIZE
  const height = size.rows * TILE_SIZE
  const pathCells = buildPathCells(paths, size.columns, size.rows)
  const clearings = buildClearings({ dwellings, spawn, altar, spawnRadius: 40 })
  const rocks = []
  let attempts = 0

  while (rocks.length < count && attempts < count * 40) {
    const column = Math.floor(noise(attempts, 0, seed) * size.columns)
    const row = Math.floor(noise(0, attempts, seed + 7) * size.rows)
    attempts += 1

    const x = column * TILE_SIZE + TILE_SIZE / 2
    const y = row * TILE_SIZE + TILE_SIZE * 0.75

    if (x < 24 || y < 30 || x > width - 24 || y > height - 16) continue
    if (isCleared(clearings, x, y)) continue
    if (isNearPath(pathCells, x, y, 1)) continue
    if (isInsideFarm(farms, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE))) continue

    const sprite = noise(attempts, attempts, seed + 11) < 0.5 ? 'rock-01' : 'rock-02'
    rocks.push({ x, y, sprite, ...ROCK_PROPS[sprite] })
  }

  return rocks
}
