import Phaser from 'phaser'
import { VIEW_WIDTH, VIEW_HEIGHT } from './constants'
import BootScene from './scenes/BootScene'
import PreloadScene from './scenes/PreloadScene'
import WorldScene from './scenes/WorldScene'

/**
 * Builds the Phaser game and mounts it into `parent`.
 *
 * The config lives here and nowhere else. Scenes are registered once, in order;
 * an unregistered scene silently never runs.
 *
 * @param {HTMLElement|string} parent container the canvas is appended to
 * @returns {Phaser.Game}
 */
export function createGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    backgroundColor: '#1b2320',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 } },
    },
    scene: [BootScene, PreloadScene, WorldScene],
  })
}
