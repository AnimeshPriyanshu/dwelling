import Phaser from 'phaser'
import { TILE_SIZE, GROUND_TILE_INDEX } from '../constants'
import { TEXTURES } from '../assets'
import Player from '../entities/Player'
import Dwelling from '../entities/Dwelling'
import { getDefaultMap, getMap, getMapWorldSize } from '../maps'
import { EventType, phaserPublish, subscribe } from '../../bridge'

const CAMERA_BACKGROUND = '#1b2320'
const OBSTACLE_DEPTH = 5
const DWELLING_DEPTH = 6

/**
 * The world. One scene instance renders every map: switching maps clears the
 * map-specific objects and rebuilds them from the registry, without restarting
 * the scene or recreating the game.
 *
 * Map-specific positions (spawn, dwellings, obstacles, doors, altar) never
 * appear here — they come from `world/maps/`.
 */
export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
    this.dwellings = []
    this.activeDwelling = null
    this.map = null
    this.mapId = null
    this.tilemap = null
    this.groundLayer = null
    this.fallbackGround = null
    this.doors = []
    this.altar = null
    this._unsubscribeMapSwitch = null
    this._handleMapSwitchRequest = null
    this._unsubscribeUiState = null
    this._handleUiStateChange = null
    this.uiInputBlocked = false
  }

  create() {
    // Reset per-run state. A scene restart must not reuse stale references.
    this.dwellings = []
    this.activeDwelling = null
    this.tilemap = null
    this.groundLayer = null
    this.fallbackGround = null
    this.doors = []
    this.altar = null
    // A restarted scene starts with both input plugins enabled again.
    this.uiInputBlocked = false

    const initialMap = getDefaultMap()
    if (!initialMap) {
      console.error('[maps] no valid map registered — the world cannot start')
      return
    }

    this.obstacles = this.physics.add.staticGroup()

    // One player and one collider survive every map switch.
    this.player = new Player(this, initialMap.spawn.x, initialMap.spawn.y)
    this.physics.add.collider(this.player, this.obstacles)

    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    // The bridge calls handlers without a context, so bind the scene method.
    this._handleMapSwitchRequest = (payload) => this.handleMapSwitch(payload)
    this._unsubscribeMapSwitch = subscribe(EventType.MAP_SWITCH, this._handleMapSwitchRequest)

    // React owns panel visibility; the world blocks its own input in response.
    this._handleUiStateChange = (payload) => this.setUiInputBlocked(Boolean(payload && payload.chatOpen))
    this._unsubscribeUiState = subscribe(EventType.UI_STATE, this._handleUiStateChange)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneTeardown, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneTeardown, this)

    this.loadMap(initialMap.id)
  }

  /**
   * Loads a map by id, replacing the current world contents. The registry is
   * the only source of map data.
   *
   * @param {string} mapId
   * @returns {boolean} true when the map was loaded
   */
  loadMap(mapId) {
    const map = getMap(mapId)

    if (!map) {
      console.warn(`[maps] unknown map id "${mapId}" — staying on the current map`)
      this.publishMapChanged()
      return false
    }

    if (this.mapId === map.id && this.map) return true

    this.clearMap()

    this.map = map
    this.mapId = map.id

    const { width, height } = getMapWorldSize(map)

    // Bounds must change before the player is repositioned.
    this.physics.world.setBounds(0, 0, width, height)

    this.createGround(map)
    this.createObstacles(map)
    this.createDwellings(map)
    this.doors = map.doors
    this.altar = map.altar

    this.player.body.reset(map.spawn.x, map.spawn.y)

    const camera = this.cameras.main
    camera.stopFollow()
    camera.setBounds(0, 0, width, height)
    camera.setBackgroundColor(CAMERA_BACKGROUND)
    camera.centerOn(map.spawn.x, map.spawn.y)
    camera.startFollow(this.player, true, 0.1, 0.1)

    this.publishMapChanged()
    return true
  }

  /**
   * Removes everything owned by the current map. The scene, player, collider
   * and static group are reused; the group is emptied so its collider stays
   * valid for the next map.
   */
  clearMap() {
    this.activeDwelling = null

    for (const dwelling of this.dwellings) {
      dwelling.destroy()
    }
    this.dwellings = []

    if (this.tilemap) {
      this.tilemap.destroy()
      this.tilemap = null
      this.groundLayer = null
    }

    if (this.fallbackGround) {
      this.fallbackGround.destroy()
      this.fallbackGround = null
    }

    if (this.obstacles) {
      this.obstacles.clear(true, true)
    }

    this.doors = []
    this.altar = null
    this.map = null
    this.mapId = null
  }

  createGround(map) {
    if (!this.textures.exists(TEXTURES.tinyTown)) {
      const { width, height } = getMapWorldSize(map)
      this.fallbackGround = this.add.graphics()
      this.fallbackGround.fillStyle(0x2f3b32)
      this.fallbackGround.fillRect(0, 0, width, height)
      return
    }

    const data = []
    for (let y = 0; y < map.size.rows; y += 1) {
      data.push(new Array(map.size.columns).fill(map.groundTile ?? GROUND_TILE_INDEX))
    }

    this.tilemap = this.make.tilemap({
      data,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    })
    const tileset = this.tilemap.addTilesetImage(
      TEXTURES.tinyTown,
      TEXTURES.tinyTown,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0
    )
    this.groundLayer = this.tilemap.createLayer(0, tileset, 0, 0)
  }

  createObstacles(map) {
    if (!this.textures.exists(TEXTURES.tinyTown)) return

    for (const def of map.obstacles) {
      const obstacle = this.obstacles.create(def.x, def.y, TEXTURES.tinyTown, def.frame)
      obstacle.setDepth(OBSTACLE_DEPTH)
      // Static bodies reset their size/offset on refreshBody(), so refresh
      // first and apply the explicit body shape afterwards.
      obstacle.refreshBody()
      obstacle.body.setSize(def.width, def.height, false)
      obstacle.body.setOffset(def.offsetX, def.offsetY)
    }
  }

  createDwellings(map) {
    if (!this.textures.exists(TEXTURES.tinyTown)) return

    for (const config of map.dwellings) {
      const dwelling = new Dwelling(this, config)
      dwelling.sprites.forEach((sprite) => sprite.setDepth(DWELLING_DEPTH))
      this.dwellings.push(dwelling)
    }
  }

  /** @param {{ mapId?: string }} payload */
  handleMapSwitch(payload) {
    if (!payload || typeof payload.mapId !== 'string') {
      console.warn('[maps] ignored a map switch without a map id')
      this.publishMapChanged()
      return
    }

    this.loadMap(payload.mapId)
  }

  publishMapChanged() {
    if (!this.map) return
    phaserPublish('mapChanged', this.map)
  }

  /**
   * Blocks or restores the world's input while the DOM owns the interaction.
   * Movement keys are released so a held key cannot leave the player moving.
   *
   * @param {boolean} blocked
   */
  setUiInputBlocked(blocked) {
    if (this.uiInputBlocked === blocked) return

    this.uiInputBlocked = blocked
    this.input.keyboard.enabled = !blocked
    this.input.enabled = !blocked

    if (blocked) {
      this.input.keyboard.resetKeys()
    }
  }

  handleSceneTeardown() {
    if (this._unsubscribeUiState) {
      this._unsubscribeUiState()
      this._unsubscribeUiState = null
    }

    if (this._unsubscribeMapSwitch) {
      this._unsubscribeMapSwitch()
      this._unsubscribeMapSwitch = null
    }
  }

  update(time, delta) {
    if (!this.player || !this.player.active) return

    // 1. Update player movement and animation state
    this.player.update(time, delta)

    // 2. Interaction zone proximity check and resolution (DW-028, DW-029)
    let closestDwelling = null
    let minDistance = Infinity

    for (const dwelling of this.dwellings) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        dwelling.x,
        dwelling.y
      )

      if (dist <= dwelling.radius && dist < minDistance) {
        minDistance = dist
        closestDwelling = dwelling
      }
    }

    // Resolve active dwelling when zones overlap: only the nearest is active.
    if (closestDwelling !== this.activeDwelling) {
      if (this.activeDwelling) {
        this.activeDwelling.setPromptVisible(false)
      }
      if (closestDwelling) {
        closestDwelling.setPromptVisible(true)
      }
      this.activeDwelling = closestDwelling
    }

    // 3. Handle interaction key ('E') inside a zone (DW-030)
    if (Phaser.Input.Keyboard.JustDown(this.interactKey) && this.activeDwelling) {
      this.activeDwelling.interact()
    }
  }
}
