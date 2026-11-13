import { TEXTURES } from './assets'

/**
 * Player walk animations.
 *
 * The supplied Sprout Lands sheet (`characters/player-sprout.png`) is a 4×4
 * grid of 48×48 frames, row-major: one row per facing direction, in the order
 * down, up, left, right, and the four frames of a row are that direction's walk
 * cycle. Verified by inspecting the frames. The keys are the ones `Player`
 * already builds as `player-walk-${direction}`.
 */
export const PLAYER_WALK_ANIMATIONS = [
  { key: 'player-walk-down', frames: [0, 1, 2, 3] },
  { key: 'player-walk-up', frames: [4, 5, 6, 7] },
  { key: 'player-walk-left', frames: [8, 9, 10, 11] },
  { key: 'player-walk-right', frames: [12, 13, 14, 15] },
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
