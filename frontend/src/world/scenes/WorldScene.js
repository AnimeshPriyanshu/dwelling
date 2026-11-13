import Phaser from 'phaser'
import { TILE_SIZE, GROUND_TILE_INDEX, GROUND_TILE_VARIANTS } from '../constants'
import { TEXTURES, PATH_TILE_FRAMES } from '../assets'
import Player from '../entities/Player'
import Dwelling from '../entities/Dwelling'
import { getDefaultMap, getMap, getMapWorldSize, summarizeMap } from '../maps'
import { buildPathCells } from '../maps/terrain'
import {
  buildFarmCells,
  buildFarmCrops,
  buildFarmFences,
  soilFrame,
  tileCentre,
} from '../farm'
import { EventType, phaserPublish, subscribe } from '../../bridge'

const CAMERA_BACKGROUND = '#1b2320'

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
    this.pathTilemap = null
    this.pathLayer = null
    this.farmTilemap = null
    this.farmLayer = null
    this.farmCrops = []
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
    this.pathTilemap = null
    this.pathLayer = null
    this.farmTilemap = null
    this.farmLayer = null
    this.farmCrops = []
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
    this.createPaths(map)
    this.createFarms(map)
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

    if (this.pathTilemap) {
      this.pathTilemap.destroy()
      this.pathTilemap = null
      this.pathLayer = null
    }

    if (this.farmTilemap) {
      this.farmTilemap.destroy()
      this.farmTilemap = null
      this.farmLayer = null
    }

    for (const crop of this.farmCrops) {
      crop.destroy()
    }
    this.farmCrops = []

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
    if (!this.textures.exists(TEXTURES.worldTiles)) {
      const { width, height } = getMapWorldSize(map)
      this.fallbackGround = this.add.graphics()
      this.fallbackGround.fillStyle(0x2f3b32)
      this.fallbackGround.fillRect(0, 0, width, height)
      return
    }

    // Scatter the supplied grass variants deterministically by cell, so the
    // field has texture without per-frame work and every load looks the same.
    const baseTile = map.groundTile ?? GROUND_TILE_INDEX
    const variants = GROUND_TILE_VARIANTS.includes(baseTile)
      ? GROUND_TILE_VARIANTS
      : [baseTile]

    const data = []
    for (let y = 0; y < map.size.rows; y += 1) {
      const row = []
      for (let x = 0; x < map.size.columns; x += 1) {
        // Integer hash of the cell, so the scatter has no visible lattice and
        // is identical on every load.
        let hash = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)
        hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
        row.push(variants[(hash >>> 0) % variants.length])
      }
      data.push(row)
    }

    this.tilemap = this.make.tilemap({
      data,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    })
    const tileset = this.tilemap.addTilesetImage(
      TEXTURES.worldTiles,
      TEXTURES.worldTiles,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0
    )
    this.groundLayer = this.tilemap.createLayer(0, tileset, 0, 0)
  }

  /**
   * Draws the map's roads and trails as a second tilemap layer above the grass.
   * `map.paths` holds tile rectangles; the fill frames are the fully opaque
   * dirt tiles from the supplied Sprout Lands sheet.
   */
  createPaths(map) {
    const paths = map.paths ?? []
    if (paths.length === 0) return

    if (!this.textures.exists(TEXTURES.pathTiles)) {
      console.warn(`[maps] missing path texture "${TEXTURES.pathTiles}" in map "${map.id}"`)
      return
    }

    const cells = buildPathCells(paths, map.size.columns, map.size.rows)
    const data = []

    for (let y = 0; y < map.size.rows; y += 1) {
      const row = []
      for (let x = 0; x < map.size.columns; x += 1) {
        if (!cells.has(`${x},${y}`)) {
          row.push(-1)
          continue
        }
        let hash = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)
        hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
        row.push(PATH_TILE_FRAMES[(hash >>> 0) % PATH_TILE_FRAMES.length])
      }
      data.push(row)
    }

    this.pathTilemap = this.make.tilemap({
      data,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    })
    const tileset = this.pathTilemap.addTilesetImage(
      TEXTURES.pathTiles,
      TEXTURES.pathTiles,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0
    )
    this.pathLayer = this.pathTilemap.createLayer(0, tileset, 0, 0)
    this.pathLayer.setDepth(1)
  }

  /**
   * Draws each farm plot: tilled soil as a tile layer, crop sprites on the
   * soil, and the rail fence as collidable props with one open gate.
   */
  createFarms(map) {
    const farms = map.farms ?? []
    if (farms.length === 0) return

    if (this.textures.exists(TEXTURES.pathTiles)) {
      const cells = buildFarmCells(farms)
      const data = []

      for (let y = 0; y < map.size.rows; y += 1) {
        const row = []
        for (let x = 0; x < map.size.columns; x += 1) {
          row.push(cells.has(`${x},${y}`) ? soilFrame(x, y) : -1)
        }
        data.push(row)
      }

      this.farmTilemap = this.make.tilemap({
        data,
        tileWidth: TILE_SIZE,
        tileHeight: TILE_SIZE,
      })
      const tileset = this.farmTilemap.addTilesetImage(
        TEXTURES.pathTiles,
        TEXTURES.pathTiles,
        TILE_SIZE,
        TILE_SIZE,
        0,
        0
      )
      this.farmLayer = this.farmTilemap.createLayer(0, tileset, 0, 0)
      this.farmLayer.setDepth(1)
    } else {
      console.warn(`[maps] missing soil texture "${TEXTURES.pathTiles}" in map "${map.id}"`)
    }

    for (const farm of farms) {
      if (this.textures.exists(TEXTURES.crops)) {
        for (const crop of buildFarmCrops(farm)) {
          const { x, y } = tileCentre(crop.column, crop.row)
          const sprite = this.add.image(x, y, TEXTURES.crops, crop.frame)
          // Sort crops by their base, so the player walks in front of the near
          // row and behind the far one.
          sprite.setDepth(y + TILE_SIZE / 2)
          this.farmCrops.push(sprite)
        }
      } else {
        console.warn(`[maps] missing crop texture "${TEXTURES.crops}" in map "${map.id}"`)
      }

      if (!this.textures.exists(TEXTURES.fences)) {
        console.warn(`[maps] missing fence texture "${TEXTURES.fences}" in map "${map.id}"`)
        continue
      }

      for (const piece of buildFarmFences(farm)) {
        const { x, y } = tileCentre(piece.column, piece.row)
        const fence = this.obstacles.create(x, y, TEXTURES.fences, piece.frame)
        fence.setDepth(y + TILE_SIZE / 2)
        if (piece.angle) fence.setAngle(piece.angle)
        fence.refreshBody()
        // Only the rail should block movement, not the air above it. Arcade
        // bodies do not rotate, so a side run gets a tall, thin body instead.
        if (piece.angle) {
          fence.body.setSize(8, TILE_SIZE, false)
          fence.body.setOffset(4, 0)
        } else {
          fence.body.setSize(TILE_SIZE, 8, false)
          fence.body.setOffset(0, 8)
        }
      }
    }
  }

  createObstacles(map) {
    for (const def of map.obstacles) {
      if (!this.textures.exists(def.sprite)) {
        console.warn(`[maps] missing obstacle texture "${def.sprite}" in map "${map.id}"`)
        continue
      }

      const obstacle = this.obstacles.create(def.x, def.y, def.sprite, def.frame)
      // Depth by the object's base so the player passes behind tall props.
      obstacle.setDepth(def.y + obstacle.displayHeight / 2)
      // Static bodies reset their size/offset on refreshBody(), so refresh
      // first and apply the explicit body shape afterwards.
      obstacle.refreshBody()
      obstacle.body.setSize(def.width, def.height, false)
      obstacle.body.setOffset(def.offsetX, def.offsetY)
    }
  }

  createDwellings(map) {
    for (const config of map.dwellings) {
      if (!this.textures.exists(config.sprite)) {
        console.warn(`[maps] missing dwelling texture "${config.sprite}" in map "${map.id}"`)
        continue
      }
      this.dwellings.push(new Dwelling(this, config))
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
    // Identity labels only: React never receives the map's mutable data.
    phaserPublish('mapChanged', summarizeMap(this.map))
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

    // 1. Update player movement and animation state, then sort by feet so the
    // player walks behind roofs and in front of ground props correctly.
    this.player.update(time, delta)
    this.player.setDepth(this.player.body.bottom)

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
