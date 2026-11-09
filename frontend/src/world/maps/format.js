import { TILE_SIZE } from '../constants'

/**
 * Map data contract (DW-032).
 *
 * A map is plain data. Scenes receive it through the registry and never
 * hard-code map-specific positions.
 *
 * @typedef {Object} Point
 * @property {number} x world pixels
 * @property {number} y world pixels
 *
 * @typedef {Object} MapSize
 * @property {number} columns width in tiles
 * @property {number} rows    height in tiles
 *
 * @typedef {Object} ObstacleConfig
 * @property {number} x
 * @property {number} y
 * @property {number} frame        tileset frame
 * @property {number} width        collision body width
 * @property {number} height       collision body height
 * @property {number} offsetX      collision body offset from the sprite top-left
 * @property {number} offsetY
 *
 * @typedef {Object} DwellingConfig
 * @property {string} id
 * @property {string} contactId
 * @property {string} name
 * @property {string} contact
 * @property {string} [role]
 * @property {number} x
 * @property {number} y
 * @property {number[]} tileFrames  four tileset frames: TL, TR, BL, BR
 * @property {number} [radius]      interaction radius in pixels
 *
 * @typedef {Object} DoorConfig
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {string} [interiorId]
 *
 * @typedef {Object} MapConfig
 * @property {string} id            stable key, e.g. "a-c"
 * @property {string} name          display name
 * @property {string} range         alphabet range, e.g. "A–C"
 * @property {MapSize} size         world dimensions in tiles
 * @property {number} [groundTile]  shared tileset frame used for the ground
 * @property {Point} spawn          player start position, in world pixels
 * @property {DwellingConfig[]} dwellings
 * @property {DoorConfig[]} doors   reserved for Milestone 8 interiors
 * @property {ObstacleConfig[]} obstacles
 * @property {Point|null} altar     reserved for Milestone 9 scenery
 */

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== ''
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0

const isPointInside = (point, width, height) =>
  Boolean(point) &&
  isFiniteNumber(point.x) &&
  isFiniteNumber(point.y) &&
  point.x >= 0 &&
  point.y >= 0 &&
  point.x <= width &&
  point.y <= height

/**
 * World size in pixels, derived once from the map's tile dimensions.
 *
 * @param {MapConfig} map
 * @returns {{width: number, height: number}}
 */
export function getMapWorldSize(map) {
  return {
    width: map.size.columns * TILE_SIZE,
    height: map.size.rows * TILE_SIZE,
  }
}

function validateDwelling(dwelling, index, width, height) {
  const errors = []
  const at = `dwellings[${index}]`

  if (!dwelling || typeof dwelling !== 'object') {
    return [`${at} must be an object`]
  }

  if (!isNonEmptyString(dwelling.id)) errors.push(`${at}.id must be a non-empty string`)
  if (!isNonEmptyString(dwelling.contactId)) {
    errors.push(`${at}.contactId must be a non-empty string`)
  }
  if (!isNonEmptyString(dwelling.name)) errors.push(`${at}.name must be a non-empty string`)
  if (!isNonEmptyString(dwelling.contact)) {
    errors.push(`${at}.contact must be a non-empty string`)
  }
  if (dwelling.role !== undefined && !isNonEmptyString(dwelling.role)) {
    errors.push(`${at}.role must be a non-empty string when present`)
  }
  if (!isPointInside(dwelling, width, height)) {
    errors.push(`${at} must be inside the map bounds`)
  }
  if (
    !Array.isArray(dwelling.tileFrames) ||
    dwelling.tileFrames.length !== 4 ||
    !dwelling.tileFrames.every(isNonNegativeInteger)
  ) {
    errors.push(`${at}.tileFrames must contain four non-negative frame indices`)
  }
  if (!isFiniteNumber(dwelling.radius) || dwelling.radius <= 0) {
    errors.push(`${at}.radius must be a positive number`)
  }

  return errors
}

function validateObstacle(obstacle, index, width, height) {
  const errors = []
  const at = `obstacles[${index}]`

  if (!obstacle || typeof obstacle !== 'object') {
    return [`${at} must be an object`]
  }

  if (!isPointInside(obstacle, width, height)) {
    errors.push(`${at} must be inside the map bounds`)
  }
  if (!isNonNegativeInteger(obstacle.frame)) {
    errors.push(`${at}.frame must be a non-negative integer`)
  }
  if (!isPositiveInteger(obstacle.width) || !isPositiveInteger(obstacle.height)) {
    errors.push(`${at}.width and ${at}.height must be positive integers`)
  }
  if (!isFiniteNumber(obstacle.offsetX) || !isFiniteNumber(obstacle.offsetY)) {
    errors.push(`${at}.offsetX and ${at}.offsetY must be finite numbers`)
  }

  return errors
}

/**
 * Validates a map config.
 *
 * Returns an array of human-readable errors. An empty array means the map can
 * be registered and loaded.
 *
 * @param {MapConfig} map
 * @returns {string[]}
 */
export function validateMap(map) {
  const errors = []

  if (!map || typeof map !== 'object') return ['map must be an object']

  if (!isNonEmptyString(map.id)) errors.push('id must be a non-empty string')
  if (!isNonEmptyString(map.name)) errors.push('name must be a non-empty string')
  if (!isNonEmptyString(map.range)) errors.push('range must be a non-empty string')

  if (!map.size || !isPositiveInteger(map.size.columns) || !isPositiveInteger(map.size.rows)) {
    errors.push('size.columns and size.rows must be positive integers')
    return errors
  }

  const { width, height } = getMapWorldSize(map)

  if (map.groundTile !== undefined && !isNonNegativeInteger(map.groundTile)) {
    errors.push('groundTile must be a non-negative integer when present')
  }
  if (!isPointInside(map.spawn, width, height)) {
    errors.push('spawn must be inside the map bounds')
  }

  if (!Array.isArray(map.dwellings)) {
    errors.push('dwellings must be an array')
  } else {
    const ids = new Set()
    const contactIds = new Set()

    map.dwellings.forEach((dwelling, index) => {
      errors.push(...validateDwelling(dwelling, index, width, height))
      if (!dwelling || typeof dwelling !== 'object') return

      if (isNonEmptyString(dwelling.id)) {
        if (ids.has(dwelling.id)) errors.push(`dwellings[${index}].id must be unique`)
        ids.add(dwelling.id)
      }
      if (isNonEmptyString(dwelling.contactId)) {
        if (contactIds.has(dwelling.contactId)) {
          errors.push(`dwellings[${index}].contactId must be unique`)
        }
        contactIds.add(dwelling.contactId)
      }
    })
  }

  if (!Array.isArray(map.doors)) {
    errors.push('doors must be an array (empty until Milestone 8)')
  }

  if (!Array.isArray(map.obstacles)) {
    errors.push('obstacles must be an array')
  } else {
    map.obstacles.forEach((obstacle, index) => {
      errors.push(...validateObstacle(obstacle, index, width, height))
    })
  }

  if (!Object.prototype.hasOwnProperty.call(map, 'altar')) {
    errors.push('altar must be present (null or a point)')
  } else if (map.altar !== null && !isPointInside(map.altar, width, height)) {
    errors.push('altar must be null or a point inside the map bounds')
  }

  return errors
}
