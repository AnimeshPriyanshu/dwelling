import { afterEach, describe, expect, it, vi } from "vitest";
import { EventType, setChatOpen, subscribe, unsubscribeAll } from "./index";

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

  it("stops delivering chat visibility once unsubscribed", () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(EventType.UI_STATE, handler);

    unsubscribe();
    setChatOpen(true);

    expect(handler).not.toHaveBeenCalled();
  });
});
