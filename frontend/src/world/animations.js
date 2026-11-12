import { TEXTURES } from './assets'

/**
 * Player walk animations.
 *
 * `characters/player-walk` is a 4 column x 3 row sheet of 16x24 frames: one
 * column per facing direction, and the three frames of a column are that
 * direction's walk cycle. The keys are the ones `Player` already builds as
 * `player-walk-${direction}`.
 */
export const PLAYER_WALK_ANIMATIONS = [
  { key: 'player-walk-down', frames: [0, 4, 8] },
  { key: 'player-walk-left', frames: [1, 5, 9] },
  { key: 'player-walk-right', frames: [2, 6, 10] },
  { key: 'player-walk-up', frames: [3, 7, 11] },
]

const FRAME_RATE = 8

/**
 * Registers the player walk animations once.
 *
 * Called after the sprite sheet has loaded and before the world starts. A key
 * that already exists is left untouched, so calling this again cannot register
 * the same animation twice. A missing sheet is skipped rather than throwing, so
 * `PreloadScene` still hands off to the world as before.
 *
 * @param {Phaser.Scene} scene
 */
export function registerPlayerAnimations(scene) {
  if (!scene.textures.exists(TEXTURES.playerWalk)) return

  for (const { key, frames } of PLAYER_WALK_ANIMATIONS) {
    if (scene.anims.exists(key)) continue

    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(TEXTURES.playerWalk, { frames }),
      frameRate: FRAME_RATE,
      repeat: -1,
    })
  }
}
