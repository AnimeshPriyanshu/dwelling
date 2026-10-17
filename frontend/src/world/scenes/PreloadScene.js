import Phaser from 'phaser'
import { ASSET_MANIFEST, loadAssets } from '../assets'

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
}
