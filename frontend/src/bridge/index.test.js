import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EventType,
  getUiInputBlocked,
  phaserPublish,
  phaserEvents,
  setUiInputBlocked,
  subscribe,
  unsubscribeAll,
} from "./index";

describe("bridge", () => {
  afterEach(() => {
    unsubscribeAll();
  });

  it("publishes and retains the input-blocking state", () => {
    const handler = vi.fn();
    subscribe(EventType.UI_STATE, handler);

    setUiInputBlocked(true);
    expect(getUiInputBlocked()).toBe(true);

    setUiInputBlocked(0);

    expect(handler).toHaveBeenNthCalledWith(1, { inputBlocked: true });
    expect(handler).toHaveBeenNthCalledWith(2, { inputBlocked: false });
    expect(getUiInputBlocked()).toBe(false);
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

  it("stops delivering input state once unsubscribed", () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(EventType.UI_STATE, handler);

    unsubscribe();
    setUiInputBlocked(true);

    expect(handler).not.toHaveBeenCalled();
  });
});
