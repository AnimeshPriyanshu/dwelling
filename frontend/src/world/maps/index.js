import { validateMap } from './format'
import aC from './a-c'
import sU from './s-u'

export { getMapWorldSize, validateMap } from './format'

/**
 * The map the world starts on. The default map owns its own id, so renaming it
 * cannot leave a copied id string behind. Falling back to the first registered
 * map keeps boot working if the default entry is ever removed or fails
 * validation.
 */
export const DEFAULT_MAP_ID = aC.id

/**
 * The HUD-facing view of a map: identity labels only, never mutable internals.
 * One projection here keeps the map selector, the HUD and the `map:changed`
 * payload from drifting apart.
 *
 * @param {import('./format').MapConfig} map
 * @returns {{id: string, name: string, range: string}}
 */
export function summarizeMap(map) {
  return { id: map.id, name: map.name, range: map.range }
}

/** @type {Map<string, import('./format').MapConfig>} */
const registry = new Map()

/**
 * Registers a map after validating it. Invalid or duplicate ids are rejected
 * with a console error/warning instead of breaking the running world.
 *
 * Adding a map is a data-only change: author its config, then call this once
 * from this module. WorldScene never needs to know the new id.
 *
 * @param {import('./format').MapConfig} map
 * @returns {boolean} true when registered
 */
export function registerMap(map) {
  const errors = validateMap(map)

  if (errors.length > 0) {
    console.error(
      `[maps] invalid map "${map && typeof map.id === 'string' ? map.id : 'unknown'}":`,
      errors.join('; ')
    )
    return false
  }

  if (registry.has(map.id)) {
    console.warn(`[maps] duplicate map id "${map.id}" ignored`)
    return false
  }

  registry.set(map.id, map)
  return true
}

/**
 * Resolves a map id. Unknown ids return null so callers can handle them
 * explicitly rather than crashing on undefined data.
 *
 * @param {string} id
 * @returns {import('./format').MapConfig|null}
 */
export function getMap(id) {
  if (typeof id !== 'string') return null
  return registry.get(id) ?? null
}

/** @param {string} id */
export function hasMap(id) {
  return typeof id === 'string' && registry.has(id)
}

/** @returns {import('./format').MapConfig|null} */
export function getDefaultMap() {
  return registry.get(DEFAULT_MAP_ID) ?? registry.values().next().value ?? null
}

/**
 * Plain summaries for UI code. Never exposes mutable map internals.
 *
 * @returns {{id: string, name: string, range: string}[]}
 */
export function listMaps() {
  return [...registry.values()].map(summarizeMap)
}

registerMap(aC)
registerMap(sU)
