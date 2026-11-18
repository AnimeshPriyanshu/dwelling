import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EventType,
  phaserPublish,
  subscribe,
  unsubscribeAll,
} from "../../bridge";

describe("Dwelling", () => {
  afterEach(() => {
    unsubscribeAll();
  });

  it("publishes a dwelling interaction with the full resident payload", () => {
    const handler = vi.fn();
    subscribe(EventType.DWELLING_INTERACT, handler);

    const dwelling = {
      id: "dwelling-redwood",
      contactId: "contact-elowen",
      name: "Redwood Cottage",
      contact: "Elowen",
      role: "Herbalist",
    };
    phaserPublish("dwellingInteract", dwelling);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling,
    });
  });

  it("second-dwelling payloads are also published", () => {
    const handler = vi.fn();
    subscribe(EventType.DWELLING_INTERACT, handler);

    const dwellingOne = {
      id: "dwelling-redwood",
      contactId: "contact-elowen",
      name: "Redwood Cottage",
      contact: "Elowen",
      role: "Herbalist",
    };
    const dwellingTwo = {
      id: "dwelling-rowan",
      contactId: "contact-peter",
      name: "Rowan Cottage",
      contact: "Peter",
      role: "Woodcutter",
    };

    phaserPublish("dwellingInteract", dwellingOne);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling: dwellingOne,
    });

    phaserPublish("dwellingInteract", dwellingTwo);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling: dwellingTwo,
    });
  });
});
