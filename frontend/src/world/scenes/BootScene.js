import Phaser from 'phaser'

/**
 * Minimal startup scene. Runs first so later scenes can assume a clean state.
 * Anything needed before a loading screen exists belongs here.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  create() {
    this.scene.start('PreloadScene')
  }
}
