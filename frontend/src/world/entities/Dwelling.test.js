import { afterEach, describe, expect, it, vi } from "vitest";
import { EventType, subscribe, unsubscribeAll } from "../../bridge";
import Dwelling from "./Dwelling";

const interaction = {
  id: "dwelling-redwood",
  contactId: "contact-elowen",
  name: "Redwood Cottage",
  contact: "Elowen",
  role: "Herbalist",
};

// `interact()` only reads the dwelling's plain description, so the instance
// can be built without any Phaser display objects.
const createDwelling = () =>
  Object.assign(Object.create(Dwelling.prototype), interaction);

describe("Dwelling", () => {
  afterEach(() => {
    unsubscribeAll();
  });

  it("publishes its interaction through the bridge", () => {
    const handler = vi.fn();
    subscribe(EventType.DWELLING_INTERACT, handler);

    createDwelling().interact();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      ...interaction,
    });
  });

  it("does not dispatch a DOM event", () => {
    const domHandler = vi.fn();
    window.addEventListener("dwelling:open-chat", domHandler);

    createDwelling().interact();

    window.removeEventListener("dwelling:open-chat", domHandler);
    expect(domHandler).not.toHaveBeenCalled();
  });
});
