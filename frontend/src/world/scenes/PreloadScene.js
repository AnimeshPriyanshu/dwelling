import Phaser from 'phaser'
import { ASSET_MANIFEST, TEXTURES, loadAssets } from '../assets'

/**
 * Directional walk animations for the Sprout Lands player sheet.
 *
 * The sheet is 4 columns × 4 rows of 48×48 frames, row-major. Each row is one
 * facing direction: down, up, right, left — verified by inspecting the frames.
 */
const PLAYER_DIRECTIONS = [
  { direction: 'down', row: 0 },
  { direction: 'up', row: 1 },
  { direction: 'right', row: 2 },
  { direction: 'left', row: 3 },
]

/**
 * Loads the asset manifest and shows progress.
 *
 * After loading, every manifest entry is checked against the texture manager:
 * a missing *required* asset is reported as an error, a missing *optional* one
 * only warns. The scene always hands off to the world, so the game never hangs
 * on the loading screen — a missing required asset leaves `WorldScene` to draw
 * its fallback ground.
 */
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene')
  }

  preload() {
    const { width, height } = this.scale
    const barWidth = Math.round(width * 0.6)
    const barHeight = 16
    const barX = (width - barWidth) / 2
    const barY = height / 2

    this.add.rectangle(barX, barY, barWidth, barHeight, 0x000000, 0.35).setOrigin(0)
    const bar = this.add.rectangle(barX, barY, 0, barHeight, 0x9ac96b).setOrigin(0)
    this.add
      .text(width / 2, barY - 24, 'Loading…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#f4f5f1',
      })
      .setOrigin(0.5)

    this.load.on('progress', (value) => {
      bar.width = barWidth * value
    })

    loadAssets(this)
  }

  create() {
    this.createPlayerAnimations()

    for (const asset of ASSET_MANIFEST) {
      if (this.textures.exists(asset.key)) continue
      if (asset.required) {
        console.error(`[assets] required asset missing: ${asset.key} (${asset.path})`)
      } else {
        console.warn(`[assets] optional asset missing: ${asset.key} (${asset.path})`)
      }
    }
    this.scene.start('WorldScene')
  }

  /**
   * Registers one four-frame walk cycle per facing. Animations belong to the
   * global animation manager, so they are registered once here rather than in
   * the player entity, which may be recreated on remount.
   */
  createPlayerAnimations() {
    for (const { direction, row } of PLAYER_DIRECTIONS) {
      const key = `player-walk-${direction}`
      if (this.anims.exists(key)) continue

      this.anims.create({
        key,
        frames: [0, 1, 2, 3].map((column) => ({
          key: TEXTURES.playerWalk,
          frame: row * 4 + column,
        })),
        frameRate: 8,
        repeat: -1,
      })
    }
  }
}
