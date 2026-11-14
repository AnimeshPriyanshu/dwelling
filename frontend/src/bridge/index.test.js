import { afterEach, describe, expect, it, vi } from "vitest";
import { EventType, phaserPublish, phaserEvents, setChatOpen, subscribe, unsubscribeAll } from "./index";

describe("bridge", () => {
  afterEach(() => {
    unsubscribeAll();
  });

  it("publishes chat visibility as a plain boolean payload", () => {
    const handler = vi.fn();
    subscribe(EventType.UI_STATE, handler);

    setChatOpen(true);
    setChatOpen(0);

    expect(handler).toHaveBeenNthCalledWith(1, { chatOpen: true });
    expect(handler).toHaveBeenNthCalledWith(2, { chatOpen: false });
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

  it("carries the map summary published by the world", () => {
    const summary = { id: "a-c", name: "Alder Creek", range: "A–C" };

    expect(phaserEvents.mapChanged(summary)).toEqual({
      type: EventType.MAP_CHANGED,
      map: summary,
    });
  });

  it("stops delivering chat visibility once unsubscribed", () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(EventType.UI_STATE, handler);

    unsubscribe();
    setChatOpen(true);

    expect(handler).not.toHaveBeenCalled();
  });
});
