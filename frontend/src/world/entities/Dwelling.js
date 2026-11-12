import { TEXTURES } from "../assets";

/**
 * Dwelling entity representing an approachable, interactive house in the world.
 *
 * Responsibilities:
 * - Visuals: Renders the 2x2 house tile structure from tiny-town.png.
 * - Solid Physics: Registers a static collision body preventing player penetration.
 * - Interaction Zone: Detects player proximity within an interaction radius.
 * - Prompt: Displays a clear visual tooltip [E] naming the resident/dwelling.
 * - Click & Key Interaction: Emits interaction events with unique contactId.
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
   * @param {number} config.x World X coordinate (center of house)
   * @param {number} config.y World Y coordinate (center of house)
   * @param {number[]} config.tileFrames 4 tile frame indices [topLeft, topRight, bottomLeft, bottomRight]
   * @param {number} [config.radius=48] Proximity interaction radius in pixels
   */
  constructor(scene, config) {
    this.scene = scene;
    this.id = config.id;
    this.contactId = config.contactId;
    this.name = config.name;
    this.contact = config.contact;
    this.role = config.role || "Resident";
    this.x = config.x;
    this.y = config.y;
    this.tileFrames = config.tileFrames;
    this.radius = config.radius || 48;

    this.isPromptVisible = false;

    // 1. Render the 4 house tiles (2x2 grid of 16x16 tiles = 32x32 house)
    this.sprites = [];
    const offsets = [
      { dx: -8, dy: -8 }, // Top-Left
      { dx: 8, dy: -8 }, // Top-Right
      { dx: -8, dy: 8 }, // Bottom-Left
      { dx: 8, dy: 8 }, // Bottom-Right
    ];

    for (let i = 0; i < 4; i++) {
      const frame = this.tileFrames[i];
      const sprite = scene.add.sprite(
        this.x + offsets[i].dx,
        this.y + offsets[i].dy,
        TEXTURES.tinyTown,
        frame,
      );
      sprite.setDepth(6);
      this.sprites.push(sprite);
    }

    // 2. Add solid static collision body in the scene's obstacle group
    if (scene.obstacles) {
      this.collider = scene.obstacles.create(
        this.x,
        this.y + 4,
        TEXTURES.tinyTown,
        0,
      );
      this.collider.setVisible(false);
      // Refresh first: a static body's refreshBody() restores the 16x16 frame
      // size, which would discard an explicit body set beforehand. With the
      // default centre=true, setSize() then centres the 30x24 body on the house.
      this.collider.refreshBody();
      this.collider.body.setSize(30, 24);
    }

    // 3. Mouse Click Interactive Zone over the house
    this.clickZone = scene.add
      .zone(this.x, this.y, 36, 36)
      .setInteractive({ useHandCursor: true });

    this.clickZone.on("pointerdown", () => {
      this.interact();
    });

    // 4. Floating Visual Prompt Badge ([E] Talk to Resident)
    this.createPromptBadge();
  }

  createPromptBadge() {
    this.promptContainer = this.scene.add.container(this.x, this.y - 30);
    this.promptContainer.setDepth(25);
    this.promptContainer.setVisible(false);

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

  interact() {
    const data = this.getInteractionData();

    // 1. Emit scene-level event
    this.scene.events.emit("dwelling:interact", data);

    // 2. Dispatch DOM event to open chat drawer in React shell
    window.dispatchEvent(
      new CustomEvent("dwelling:open-chat", {
        detail: data,
      }),
    );
  }

  destroy() {
    this.sprites.forEach((s) => s.destroy());
    if (this.collider) this.collider.destroy();
    if (this.clickZone) this.clickZone.destroy();
    if (this.promptContainer) this.promptContainer.destroy();
  }
}
