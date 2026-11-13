import { afterEach, describe, expect, it, vi } from "vitest";
import Dwelling from "./Dwelling";
import { EventType, subscribe, unsubscribeAll } from "../../bridge";

const CONFIG = {
  id: "dwelling-redwood",
  contactId: "contact-elowen",
  name: "Redwood Cottage",
  contact: "Elowen",
  role: "Herbalist",
  x: 120,
  y: 200,
  sprite: "cottage-red",
};

const SECOND_CONFIG = {
  id: "dwelling-rowan",
  contactId: "contact-rowan",
  name: "Rowan Lodge",
  contact: "Rowan",
  role: "Carpenter",
  x: 400,
  y: 200,
  sprite: "cottage-blue",
};

const payloadFor = ({ id, contactId, name, contact, role }) => ({
  id,
  contactId,
  name,
  contact,
  role,
});

// Minimal stand-in for the parts of a Phaser scene a Dwelling touches.
const createScene = () => {
  const zoneHandlers = {};

  const image = {
    width: 64,
    height: 48,
    setDepth: vi.fn(),
    destroy: vi.fn(),
  };
  const container = {
    setDepth: vi.fn(),
    setVisible: vi.fn(),
    add: vi.fn(),
    destroy: vi.fn(),
  };
  const zone = {
    setInteractive: vi.fn(function setInteractive() {
      return this;
    }),
    on: vi.fn((name, handler) => {
      zoneHandlers[name] = handler;
    }),
    destroy: vi.fn(),
  };

  return {
    zoneHandlers,
    scene: {
      events: { emit: vi.fn() },
      add: {
        image: vi.fn(() => image),
        zone: vi.fn(() => zone),
        container: vi.fn(() => container),
        rectangle: vi.fn(() => ({
          setStrokeStyle: vi.fn(),
          setOrigin: vi.fn(),
        })),
        text: vi.fn(() => ({ setOrigin: vi.fn() })),
      },
    },
  };
};

describe("Dwelling interaction", () => {
  afterEach(() => {
    unsubscribeAll();
    vi.restoreAllMocks();
  });

  it("publishes the interaction through the bridge", () => {
    const { scene } = createScene();
    const dwelling = new Dwelling(scene, CONFIG);
    const handler = vi.fn();
    subscribe(EventType.DWELLING_INTERACT, handler);

    dwelling.interact();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling: payloadFor(CONFIG),
    });
  });

  it("does not dispatch a DOM event or emit a duplicate scene event", () => {
    const { scene } = createScene();
    const dwelling = new Dwelling(scene, CONFIG);
    const dispatch = vi.spyOn(window, "dispatchEvent");

    dwelling.interact();

    expect(dispatch).not.toHaveBeenCalled();
    expect(scene.events.emit).not.toHaveBeenCalled();
  });

  it("publishes the same interaction when the building is clicked", () => {
    const { scene, zoneHandlers } = createScene();
    new Dwelling(scene, CONFIG);
    const handler = vi.fn();
    subscribe(EventType.DWELLING_INTERACT, handler);

    expect(zoneHandlers.pointerdown).toBeTypeOf("function");
    zoneHandlers.pointerdown();

    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling: payloadFor(CONFIG),
    });
  });

  it("publishes the resident that owns the clicked dwelling", () => {
    const first = createScene();
    const second = createScene();
    new Dwelling(first.scene, CONFIG);
    new Dwelling(second.scene, SECOND_CONFIG);
    const handler = vi.fn();
    subscribe(EventType.DWELLING_INTERACT, handler);

    second.zoneHandlers.pointerdown();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling: payloadFor(SECOND_CONFIG),
    });
  });
});
