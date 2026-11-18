import { TILE_SIZE } from './constants'
import { SOIL_TILE_FRAMES, FENCE_FRAMES, CROP_ROWS, CROP_STAGES } from './assets'

/**
 * Farm plots.
 *
 * A farm is plain data: a tile rectangle of tilled soil inside a rail fence,
 * with one gate. This module turns that rectangle into the three things the
 * scene needs — soil cells, fence pieces and crop sprites — so the map files
 * only ever describe where a farm is, never how it is drawn.
 *
 * Soil, fence and crops all come from the supplied packs (Sprout Lands tilled
 * dirt, fence and plant sheets); nothing is redrawn.
 */

const KEY = (column, row) => `${column},${row}`

/** Width of a gate, in tiles. Two tiles keeps the seam centred on a path. */
const GATE_WIDTH = 2

/**
 * The tile rectangle a farm occupies, including its fence ring.
 *
 * @param {import('./maps/format').FarmConfig} farm
 */
export function getFarmFootprint(farm) {
  return { x: farm.x - 1, y: farm.y - 1, w: farm.w + 2, h: farm.h + 2 }
}

/**
 * Rasterises farm soil into a set of cells, for the soil layer.
 *
 * @param {import('./maps/format').FarmConfig[]} farms
 * @returns {Set<string>}
 */
export function buildFarmCells(farms = []) {
  const cells = new Set()
  for (const farm of farms) {
    for (let row = farm.y; row < farm.y + farm.h; row += 1) {
      for (let column = farm.x; column < farm.x + farm.w; column += 1) {
        cells.add(KEY(column, row))
      }
    }
  }
  return cells
}

/**
 * True when a cell is inside a farm or its fence ring, so scenery is kept out.
 * Pass `margin: 1` to keep a service verge clear as well.
 *
 * @param {import('./maps/format').FarmConfig[]} farms
 * @param {number} column
 * @param {number} row
 * @param {number} [margin] extra tiles on every side
 */
export function isInsideFarm(farms, column, row, margin = 0) {
  return (farms ?? []).some((farm) => {
    const area = getFarmFootprint(farm)
    return (
      column >= area.x - margin &&
      column < area.x + area.w + margin &&
      row >= area.y - margin &&
      row < area.y + area.h + margin
    )
  })
}

/**
 * Columns covered by a gate on a horizontal edge, or rows on a vertical edge.
 *
 * @param {import('./maps/format').FarmConfig} farm
 */
function gateSpan(farm) {
  const horizontal = farm.gate === 'north' || farm.gate === 'south'
  const length = horizontal ? farm.w : farm.h
  const start = (horizontal ? farm.x : farm.y) + Math.floor(length / 2) - GATE_WIDTH / 2
  return { start, end: start + GATE_WIDTH - 1 }
}

function isGateTile(farm, column, row) {
  const { start, end } = gateSpan(farm)
  switch (farm.gate) {
    case 'north':
      return row === farm.y - 1 && column >= start && column <= end
    case 'south':
      return row === farm.y + farm.h && column >= start && column <= end
    case 'west':
      return column === farm.x - 1 && row >= start && row <= end
    default:
      return column === farm.x + farm.w && row >= start && row <= end
  }
}

/** Assigns cap/run frames along a fence line. */
function runFrames(count, capA, middle, capB) {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return capA
    if (index === count - 1) return capB
    return middle
  })
}

/**
 * Fence pieces for a farm, as tile coordinates plus the sheet frame to draw.
 *
 * Corners belong to the horizontal runs, which keeps the rail continuous
 * around the plot. Side runs reuse the horizontal frames turned a quarter
 * turn, so the posts and rails line up exactly.
 *
 * @param {import('./maps/format').FarmConfig} farm
 * @returns {Array<{column: number, row: number, frame: number, angle: number}>}
 */
export function buildFarmFences(farm) {
  const pieces = []
  const left = farm.x - 1
  const right = farm.x + farm.w
  const top = farm.y - 1
  const bottom = farm.y + farm.h

  for (const row of [top, bottom]) {
    const columns = []
    for (let column = left; column <= right; column += 1) {
      if (!isGateTile(farm, column, row)) columns.push(column)
    }
    const frames = runFrames(columns.length, FENCE_FRAMES.left, FENCE_FRAMES.horizontal, FENCE_FRAMES.right)
    columns.forEach((column, index) => pieces.push({ column, row, frame: frames[index], angle: 0 }))
  }

  for (const column of [left, right]) {
    const rows = []
    for (let row = farm.y; row < farm.y + farm.h; row += 1) {
      if (!isGateTile(farm, column, row)) rows.push(row)
    }
    const frames = runFrames(rows.length, FENCE_FRAMES.left, FENCE_FRAMES.horizontal, FENCE_FRAMES.right)
    rows.forEach((row, index) =>
      pieces.push({ column, row, frame: frames[index], angle: FENCE_FRAMES.verticalAngle })
    )
  }

  return pieces
}

/**
 * Crop sprites for a farm, one per soil cell.
 *
 * Growth stage comes from a hash of the cell, so a field is a patchwork of
 * stages instead of a uniform block, and it looks the same on every load.
 *
 * @param {import('./maps/format').FarmConfig} farm
 * @returns {Array<{column: number, row: number, frame: number}>}
 */
export function buildFarmCrops(farm) {
  const row = CROP_ROWS[farm.crop ?? 'wheat'] ?? CROP_ROWS.wheat
  const crops = []

  for (let y = farm.y; y < farm.y + farm.h; y += 1) {
    for (let x = farm.x; x < farm.x + farm.w; x += 1) {
      let hash = Math.imul(x + 1, 2246822519) ^ Math.imul(y + 1, 3266489917)
      hash = Math.imul(hash ^ (hash >>> 15), 668265263)
      const stage = CROP_STAGES[(hash >>> 0) % CROP_STAGES.length]
      crops.push({ column: x, row: y, frame: row * 6 + stage })
    }
  }

  return crops
}

/** Centre of a tile, in world pixels — used for crop sprites. */
export function tileCentre(column, row) {
  return { x: column * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 }
}

/**
 * Picks a soil frame for a cell, so the plot is speckled rather than flat.
 *
 * @param {number} column
 * @param {number} row
 */
export function soilFrame(column, row) {
  let hash = Math.imul(column + 1, 374761393) ^ Math.imul(row + 1, 668265263)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return SOIL_TILE_FRAMES[(hash >>> 0) % SOIL_TILE_FRAMES.length]
}
