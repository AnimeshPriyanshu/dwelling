import { afterEach, describe, expect, it, vi } from "vitest";

// Phaser probes a real canvas at import time, which jsdom cannot provide. The
// scene only needs these pieces for the behaviour under test, so they are
// stubbed rather than booting a whole game.
vi.mock("phaser", () => {
  class Scene {}
  class Sprite {}

  return {
    default: {
      Scene,
      Physics: { Arcade: { Sprite } },
      Scenes: { Events: { SHUTDOWN: "shutdown", DESTROY: "destroy" } },
      Math: {
        Distance: {
          Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
        },
      },
      Input: {
        Keyboard: {
          JustDown: (key) => {
            if (key._justDown) {
              key._justDown = false;
              return true;
            }
            return false;
          },
        },
      },
    },
  };
});

import WorldScene from "./WorldScene";
import Dwelling from "../entities/Dwelling";
import { EventType, subscribe, unsubscribeAll } from "../../bridge";

// The scene is exercised through its prototype: `update` and the UI-input
// blocker only need plain fields, so no Phaser game has to boot in jsdom.
const createScene = (overrides = {}) =>
  Object.assign(Object.create(WorldScene.prototype), {
    player: {
      active: true,
      x: 100,
      y: 100,
      body: { bottom: 120 },
      update: vi.fn(),
      setDepth: vi.fn(),
    },
    dwellings: [],
    activeDwelling: null,
    interactKey: { _justDown: false },
    input: { enabled: true, keyboard: { enabled: true, resetKeys: vi.fn() } },
    uiInputBlocked: false,
    ...overrides,
  });

// The stub scene a real Dwelling needs to build its sprite, click zone and
// prompt badge.
const createDwellingScene = () => {
  const zone = {
    setInteractive: vi.fn(function setInteractive() {
      return this;
    }),
    on: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    add: {
      image: vi.fn(() => ({
        width: 64,
        height: 48,
        setDepth: vi.fn(),
        destroy: vi.fn(),
      })),
      zone: vi.fn(() => zone),
      container: vi.fn(() => ({
        setDepth: vi.fn(),
        setVisible: vi.fn(),
        add: vi.fn(),
        destroy: vi.fn(),
      })),
      rectangle: vi.fn(() => ({ setStrokeStyle: vi.fn(), setOrigin: vi.fn() })),
      text: vi.fn(() => ({ setOrigin: vi.fn() })),
    },
  };
};

const createDwelling = (overrides = {}) => ({
  x: 100,
  y: 100,
  radius: 64,
  setPromptVisible: vi.fn(),
  interact: vi.fn(),
  ...overrides,
});

describe("WorldScene interaction routing", () => {
  afterEach(() => {
    unsubscribeAll();
    vi.restoreAllMocks();
  });

  it("interacts with the dwelling in range when E is pressed", () => {
    const dwelling = createDwelling();
    const scene = createScene({ dwellings: [dwelling] });
    scene.interactKey._justDown = true;

    scene.update(0, 16);

    expect(dwelling.interact).toHaveBeenCalledTimes(1);
    expect(dwelling.setPromptVisible).toHaveBeenCalledWith(true);
    expect(scene.activeDwelling).toBe(dwelling);
  });

  it("publishes the in-range dwelling through the bridge when E is pressed", () => {
    const dwelling = new Dwelling(createDwellingScene(), {
      id: "dwelling-rowan",
      contactId: "contact-rowan",
      name: "Rowan Lodge",
      contact: "Rowan",
      role: "Carpenter",
      x: 100,
      y: 100,
      sprite: "cottage-blue",
    });
    const scene = createScene({ dwellings: [dwelling] });
    const handler = vi.fn();
    subscribe(EventType.DWELLING_INTERACT, handler);

    scene.interactKey._justDown = true;
    scene.update(0, 16);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling: {
        id: "dwelling-rowan",
        contactId: "contact-rowan",
        name: "Rowan Lodge",
        contact: "Rowan",
        role: "Carpenter",
      },
    });
  });

  it("does not interact with a dwelling that is out of range", () => {
    const dwelling = createDwelling({ x: 900, y: 900 });
    const scene = createScene({ dwellings: [dwelling] });
    scene.interactKey._justDown = true;

    scene.update(0, 16);

    expect(dwelling.interact).not.toHaveBeenCalled();
    expect(scene.activeDwelling).toBeNull();
  });

  it("ignores E when no dwelling is nearby", () => {
    const scene = createScene();
    scene.interactKey._justDown = true;

    scene.update(0, 16);

    expect(scene.activeDwelling).toBeNull();
  });

  it("blocks world input while the drawer is open and restores it on close", () => {
    const scene = createScene();

    scene.setUiInputBlocked(true);

    expect(scene.input.keyboard.enabled).toBe(false);
    expect(scene.input.enabled).toBe(false);
    expect(scene.input.keyboard.resetKeys).toHaveBeenCalledTimes(1);

    scene.setUiInputBlocked(false);

    expect(scene.input.keyboard.enabled).toBe(true);
    expect(scene.input.enabled).toBe(true);
  });

  it("interacts again once the drawer closes", () => {
    const dwelling = createDwelling();
    const scene = createScene({ dwellings: [dwelling] });

    scene.setUiInputBlocked(true);
    scene.setUiInputBlocked(false);

    scene.interactKey._justDown = true;
    scene.update(0, 16);

    expect(dwelling.interact).toHaveBeenCalledTimes(1);
  });
});
