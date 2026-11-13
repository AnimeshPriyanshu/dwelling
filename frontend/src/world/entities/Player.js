import Phaser from "phaser";
import { TEXTURES } from "../assets";

/**
 * Direction-to-idle-frame mapping for the Sprout Lands player sheet.
 * Layout: 4 columns × 4 rows of 48×48 frames, row-major. Each row is a facing
 * direction (down, up, left, right), so the idle frame is the row's first frame.
 */
const IDLE_FRAMES = {
  down: 0,
  up: 4,
  left: 8,
  right: 12,
};

/**
 * Player entity that extends Phaser.Physics.Arcade.Sprite.
 *
 * Responsibilities:
 * - Movement: 8-direction velocity with normalized diagonals.
 * - Input: Arrow keys and WASD, plus Shift run modifier.
 * - Physics: Explicit 3/4-tilt collision body and world-bounds containment.
 * - Animation: Plays walk animations per facing direction, stops on idle frame.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, TEXTURES.playerWalk, IDLE_FRAMES.down);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Depth is sorted against world objects by the scene from the feet up.
    this.setDepth(y);

    // Explicit 3/4-tilt collision body: feet only, so the character can walk
    // behind the top of a roof while still standing on the ground. The player
    // sheet's frames are 48×48, so the body sits at the bottom of the frame.
    this.body.setSize(12, 8);
    this.body.setOffset(18, 36);
    this.setCollideWorldBounds(true);

    // Movement speeds in pixels per second
    this.walkSpeed = 120;
    this.runMultiplier = 1.6;
    this.isRunning = false;
    this.direction = "down";

    // Input bindings: Arrow keys, WASD, and Shift
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.shiftKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );

    // Set initial idle frame
    if (this.texture.key === TEXTURES.playerWalk) {
      this.setFrame(IDLE_FRAMES.down);
    }
  }

  update(_time, _delta) {
    if (!this.body) return;

    // Run toggle via Shift key
    this.isRunning = this.shiftKey.isDown;
    const speed = this.isRunning
      ? this.walkSpeed * this.runMultiplier
      : this.walkSpeed;

    // Direction input detection (Arrow keys or WASD)
    const left = (this.cursors.left?.isDown || this.wasd.left?.isDown) ?? false;
    const right =
      (this.cursors.right?.isDown || this.wasd.right?.isDown) ?? false;
    const up = (this.cursors.up?.isDown || this.wasd.up?.isDown) ?? false;
    const down = (this.cursors.down?.isDown || this.wasd.down?.isDown) ?? false;

    let dx = 0;
    let dy = 0;

    if (left) dx -= 1;
    if (right) dx += 1;
    if (up) dy -= 1;
    if (down) dy += 1;

    // Normalize diagonal movement speed to avoid faster diagonal travel
    if (dx !== 0 && dy !== 0) {
      const invSqrt2 = 0.70710678;
      dx *= invSqrt2;
      dy *= invSqrt2;
    }

    this.body.setVelocity(dx * speed, dy * speed);

    // Update facing direction
    if (dx < 0) {
      this.direction = "left";
    } else if (dx > 0) {
      this.direction = "right";
    } else if (dy < 0) {
      this.direction = "up";
    } else if (dy > 0) {
      this.direction = "down";
    }

    // Update animations independently from movement physics
    const isMoving = dx !== 0 || dy !== 0;
    const animKey = `player-walk-${this.direction}`;

    if (isMoving) {
      if (this.scene.anims.exists(animKey)) {
        this.play(animKey, true);
      }
    } else {
      this.stop();
      if (this.texture.key === TEXTURES.playerWalk) {
        this.setFrame(IDLE_FRAMES[this.direction] ?? 0);
      }
    }
  }

  destroy(fromScene) {
    super.destroy(fromScene);
  }
}
