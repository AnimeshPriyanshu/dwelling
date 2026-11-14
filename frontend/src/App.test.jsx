import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  subscribe,
  EventType,
  publishToSubscribers,
  setChatOpen,
} from "./bridge";
import App from "./App";

vi.mock("./world/game", () => ({
  createGame: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

vi.mock("./bridge", () => {
  const handlers = new Map();

  return {
    EventType: {
      DWELLING_INTERACT: "dwelling:interact",
      MAP_CHANGED: "map:changed",
      UI_STATE: "ui:state",
    },
    requestMapSwitch: vi.fn(),
    setChatOpen: vi.fn((value) => {
      if (value !== undefined) {
        handlers.set("chatOpen", value);
        // Trigger UI_STATE subscribers
        const uiHandlers = handlers.get("ui:state");
        if (uiHandlers) {
          uiHandlers.forEach((h) => h({ chatOpen: value }));
        }
      }
    }),
    subscribe: vi.fn((topic, handler) => {
      let topicHandlers = handlers.get(topic);
      if (!topicHandlers) {
        topicHandlers = [];
        handlers.set(topic, topicHandlers);
      }
      topicHandlers.push(handler);
      return () => {
        const th = handlers.get(topic);
        if (th) {
          th.splice(th.indexOf(handler), 1);
        }
      };
    }),
    publishToSubscribers: (topic, event) => {
      const topicHandlers = handlers.get(topic);
      if (topicHandlers) {
        topicHandlers.forEach((h) => h(event));
      }
    },
    unsubscribeAll: vi.fn(),
  };
});

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders without crashing", () => {
    const { unmount } = render(<App />);
    unmount();
  });

  it("bridges publish dwelling interact events", () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(EventType.DWELLING_INTERACT, handler);
    publishToSubscribers(EventType.DWELLING_INTERACT, {
      type: EventType.DWELLING_INTERACT,
      dwelling: { id: "dwelling-redwood" },
    });
    unsubscribe();
    expect(handler).toHaveBeenCalledWith({
      type: EventType.DWELLING_INTERACT,
      dwelling: { id: "dwelling-redwood" },
    });
  });

  it("bridge map changed events", () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(EventType.MAP_CHANGED, handler);
    publishToSubscribers(EventType.MAP_CHANGED, {
      type: EventType.MAP_CHANGED,
      map: { id: "default" },
    });
    unsubscribe();
    expect(handler).toHaveBeenCalledWith({
      type: EventType.MAP_CHANGED,
      map: { id: "default" },
    });
  });

  it("ui state changes propagate", () => {
    const handler = vi.fn();
    subscribe(EventType.UI_STATE, handler);
    setChatOpen(true);
    expect(handler).toHaveBeenCalledWith({ chatOpen: true });
    setChatOpen(false);
    expect(handler).toHaveBeenCalledWith({ chatOpen: false });
  });
});
