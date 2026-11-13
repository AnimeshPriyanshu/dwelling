import { TEXTURES } from '../assets'
import { phaserPublish } from '../../bridge'

/**
 * Dwelling entity representing an approachable, interactive house in the world.
 *
 * Responsibilities:
 * - Visuals: one cottage sprite from the supplied Sunnyside tileset crop.
 * - Solid physics: registers a static collision body at the building's base.
 * - Interaction zone: detects player proximity within an interaction radius.
 * - Prompt: displays a clear visual tooltip [E] naming the resident/dwelling.
 * - Click & key interaction: publishes the interaction through the bridge.
 *
 * Map data provides the sprite key and position; nothing about a specific
 * dwelling is hard-coded here.
 */
export default class Dwelling {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} config
   * @param {string} config.id Unique dwelling ID (e.g., 'dwelling-redwood')
   * @param {string} config.contactId Unique contact ID (e.g., 'contact-elowen')
   * @param {string} config.name Display name of the dwelling
   * @param {string} config.contact Name of the resident contact
   * @param {string} [config.role] Role or profession of resident
   * @param {number} config.x World X coordinate (center of the building)
   * @param {number} config.y World Y coordinate (center of the building)
   * @param {string} config.sprite Texture key of the cottage image
   * @param {number} [config.radius=64] Proximity interaction radius in pixels
   * @param {number} [config.bodyHeight=14] Solid collision height at the base
   */
  constructor(scene, config) {
    this.scene = scene
    this.id = config.id
    this.contactId = config.contactId
    this.name = config.name
    this.contact = config.contact
    this.role = config.role || 'Resident'
    this.x = config.x
    this.y = config.y
    this.radius = config.radius || 64

    this.isPromptVisible = false;

    // 1. The building itself, drawn at native pixel size.
    this.sprite = scene.add.image(this.x, this.y, config.sprite)
    this.width = this.sprite.width
    this.height = this.sprite.height
    this.baseY = this.y + this.height / 2
    this.sprite.setDepth(this.baseY)

    // 2. Solid static body across the lower part of the building. A static
    // body keeps the group's single collider valid across map switches.
    if (scene.obstacles) {
      const bodyHeight = config.bodyHeight ?? 14
      const bodyWidth = Math.max(12, Math.round(this.width * 0.72))
      this.collider = scene.obstacles.create(
        this.x,
        this.baseY - bodyHeight / 2,
        TEXTURES.worldTiles,
        0
      )
      this.collider.setVisible(false)
      this.collider.refreshBody()
      this.collider.body.setSize(bodyWidth, bodyHeight)
    }

    // 3. Mouse click zone over the building.
    this.clickZone = scene.add
      .zone(this.x, this.y, this.width + 8, this.height)
      .setInteractive({ useHandCursor: true })

    this.clickZone.on("pointerdown", () => {
      this.interact();
    });

    // 4. Floating visual prompt badge ([E] Talk to Resident).
    this.createPromptBadge()
  }

  createPromptBadge() {
    const promptY = this.y - this.height / 2 - 16
    this.promptContainer = this.scene.add.container(this.x, promptY)
    this.promptContainer.setDepth(this.baseY + 60)
    this.promptContainer.setVisible(false)

    const label = `[E] ${this.contact}`;
    const textWidth = Math.max(label.length * 7 + 16, 70);

    const bg = this.scene.add.rectangle(0, 0, textWidth, 20, 0x161c1a, 0.88);
    bg.setStrokeStyle(1, 0x9ac96b, 0.9);
    bg.setOrigin(0.5, 0.5);

    const text = this.scene.add.text(0, 0, label, {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "11px",
      color: "#f4f5f1",
      fontStyle: "bold",
    });
    text.setOrigin(0.5, 0.5);

    this.promptContainer.add([bg, text]);
  }

  setPromptVisible(visible) {
    if (this.isPromptVisible === visible) return;
    this.isPromptVisible = visible;
    this.promptContainer.setVisible(visible);
  }

  getInteractionData() {
    return {
      id: this.id,
      contactId: this.contactId,
      name: this.name,
      contact: this.contact,
      role: this.role,
    };
  }

  /**
   * Opens this dwelling's conversation. The click zone and the scene's E-key
   * handler both call this method, so there is exactly one interaction path
   * and one payload shape (ADR-0005).
   */
  interact() {
    phaserPublish("dwellingInteract", this.getInteractionData());
  }

  destroy() {
    if (this.sprite) this.sprite.destroy()
    if (this.collider) this.collider.destroy()
    if (this.clickZone) this.clickZone.destroy()
    if (this.promptContainer) this.promptContainer.destroy()
  }
}
