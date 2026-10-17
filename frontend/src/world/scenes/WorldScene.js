import Phaser from 'phaser'
import {
  TILE_SIZE,
  GROUND_TILE_INDEX,
  WORLD_TILES_X,
  WORLD_TILES_Y,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../constants'
import { TEXTURES } from '../assets'
import Player from '../entities/Player'

/**
 * Prop definitions from tiny-town.png (16x16 tile grid).
 * Used to construct static obstacles in the world.
 */
const OBSTACLE_DEFS = [
  // Horizontal fence line (North-West)
  { x: 360, y: 240, frame: 80, width: 16, height: 14, offsetX: 0, offsetY: 2 },
  { x: 376, y: 240, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
  { x: 392, y: 240, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
  { x: 408, y: 240, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
  { x: 424, y: 240, frame: 82, width: 16, height: 14, offsetX: 0, offsetY: 2 },

  // Vertical fence line (North-East)
  { x: 560, y: 200, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
  { x: 560, y: 216, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
  { x: 560, y: 232, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
  { x: 560, y: 248, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },

  // Tree grove (South of center spawn)
  { x: 440, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
  { x: 472, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
  { x: 504, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
  { x: 456, y: 444, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
  { x: 488, y: 444, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },

  // Scattered rocks and wood stumps
  { x: 380, y: 340, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
  { x: 540, y: 340, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
  { x: 480, y: 240, frame: 93, width: 12, height: 12, offsetX: 2, offsetY: 2 },
  { x: 420, y: 300, frame: 93, width: 12, height: 12, offsetX: 2, offsetY: 2 },

  // Corner and perimeter obstacles to verify boundary collisions
  { x: 48, y: 48, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
  { x: 912, y: 48, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
  { x: 48, y: 592, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
  { x: 912, y: 592, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
  { x: 100, y: 320, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
  { x: 860, y: 320, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
]

/**
 * Dwelling house structures in the world.
 * Each house has 2x2 tiles from tiny-town.png, collision, and click-to-chat interaction.
 */
const DWELLINGS = [
  {
    id: 'dwelling-1',
    name: 'Redwood Cottage',
    contact: 'Elowen',
    x: 280,
    y: 160,
    tiles: [
      { dx: -8, dy: -8, frame: 52 },
      { dx: 8, dy: -8, frame: 53 },
      { dx: -8, dy: 8, frame: 64 },
      { dx: 8, dy: 8, frame: 65 },
    ],
  },
  {
    id: 'dwelling-2',
    name: 'Cobalt Haven',
    contact: 'Rowan',
    x: 680,
    y: 160,
    tiles: [
      { dx: -8, dy: -8, frame: 54 },
      { dx: 8, dy: -8, frame: 55 },
      { dx: -8, dy: 8, frame: 66 },
      { dx: 8, dy: 8, frame: 67 },
    ],
  },
]

/**
 * WorldScene renders the bounded tiled world, dwellings, static obstacle colliders,
 * spawns the Player entity, and coordinates camera tracking.
 */
export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }

  create() {
    // 1. Render ground layer
    if (this.textures.exists(TEXTURES.tinyTown)) {
      this.createGroundLayer()
    } else {
      console.error('[world] ground tileset missing — drawing fallback ground')
      this.createFallbackGround()
    }

    // 2. Set Arcade Physics world bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    // 3. Register player walk animations if not already present
    this.createPlayerAnimations()

    // 4. Create static obstacles group (props from tiny-town tileset)
    this.createObstacles()

    // 5. Create dwellings (clickable houses with collision)
    this.createDwellings()

    // 6. Spawn Player at center of the world
    const spawnX = Math.round(WORLD_WIDTH / 2)
    const spawnY = Math.round(WORLD_HEIGHT / 2)
    this.player = new Player(this, spawnX, spawnY)

    // 7. Register physics collider between player and static obstacles (including houses)
    this.physics.add.collider(this.player, this.obstacles)

    // 8. Key for interacting (E key)
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    // 9. Setup Camera: follow player smoothly, clamped to world bounds
    this.setupCamera()
  }

  createGroundLayer() {
    const data = []
    for (let y = 0; y < WORLD_TILES_Y; y += 1) {
      data.push(new Array(WORLD_TILES_X).fill(GROUND_TILE_INDEX))
    }

    const map = this.make.tilemap({
      data,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    })
    const tileset = map.addTilesetImage(
      TEXTURES.tinyTown,
      TEXTURES.tinyTown,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0
    )
    map.createLayer(0, tileset, 0, 0)
  }

  createFallbackGround() {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x2f3b32)
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  }

  createPlayerAnimations() {
    if (!this.textures.exists(TEXTURES.playerWalk)) return

    const animConfigs = [
      { key: 'player-walk-down', frames: [0, 4, 8, 4] },
      { key: 'player-walk-left', frames: [1, 5, 9, 5] },
      { key: 'player-walk-right', frames: [2, 6, 10, 6] },
      { key: 'player-walk-up', frames: [3, 7, 11, 7] },
    ]

    for (const config of animConfigs) {
      if (!this.anims.exists(config.key)) {
        this.anims.create({
          key: config.key,
          frames: this.anims.generateFrameNumbers(TEXTURES.playerWalk, {
            frames: config.frames,
          }),
          frameRate: 8,
          repeat: -1,
        })
      }
    }
  }

  createObstacles() {
    this.obstacles = this.physics.add.staticGroup()

    if (!this.textures.exists(TEXTURES.tinyTown)) return

    for (const def of OBSTACLE_DEFS) {
      const obstacle = this.obstacles.create(def.x, def.y, TEXTURES.tinyTown, def.frame)
      obstacle.setDepth(5)
      obstacle.body.setSize(def.width, def.height)
      obstacle.body.setOffset(def.offsetX, def.offsetY)
      obstacle.refreshBody()
    }
  }

  createDwellings() {
    if (!this.textures.exists(TEXTURES.tinyTown)) return

    for (const dwelling of DWELLINGS) {
      // 1. Render the house tiles
      for (const t of dwelling.tiles) {
        const tileSprite = this.add.sprite(
          dwelling.x + t.dx,
          dwelling.y + t.dy,
          TEXTURES.tinyTown,
          t.frame
        )
        tileSprite.setDepth(6)
      }

      // 2. Add solid collision obstacle so player cannot walk through the house
      const houseCollider = this.obstacles.create(dwelling.x, dwelling.y + 4, TEXTURES.tinyTown, 0)
      houseCollider.setVisible(false)
      houseCollider.body.setSize(30, 24)
      houseCollider.body.setOffset(-15, -12)
      houseCollider.refreshBody()

      // 3. Click interaction zone over the house
      const clickZone = this.add
        .zone(dwelling.x, dwelling.y, 34, 34)
        .setInteractive({ useHandCursor: true })

      clickZone.on('pointerdown', () => {
        this.openDwellingChat(dwelling)
      })

      // Store reference on dwelling
      dwelling.zone = clickZone
    }
  }

  openDwellingChat(dwelling) {
    window.dispatchEvent(
      new CustomEvent('dwelling:open-chat', {
        detail: {
          id: dwelling.id,
          name: dwelling.name,
          contact: dwelling.contact,
        },
      })
    )
  }

  setupCamera() {
    const camera = this.cameras.main
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    camera.setBackgroundColor('#1b2320')

    if (this.player) {
      camera.startFollow(this.player, true, 0.1, 0.1)
    }
  }

  update(time, delta) {
    if (this.player && this.player.active) {
      this.player.update(time, delta)

      // Handle keyboard interact (E key) when near any dwelling
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        for (const dwelling of DWELLINGS) {
          const dist = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            dwelling.x,
            dwelling.y
          )
          if (dist < 50) {
            this.openDwellingChat(dwelling)
            break
          }
        }
      }
    }
  }
}
