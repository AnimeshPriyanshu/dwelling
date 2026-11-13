import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import App from "./App";
import {
  EventType,
  publishToSubscribers,
  setChatOpen,
  subscribe,
} from "./bridge";

vi.mock("./world/game", () => ({
  createGame: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

// A working in-memory bridge, so the tests exercise the real publication path
// instead of a hand-dispatched DOM event.
vi.mock("./bridge", () => {
  const handlers = new Map();

  return {
    EventType: {
      DWELLING_INTERACT: "dwelling:interact",
      MAP_CHANGED: "map:changed",
      UI_STATE: "ui:state",
    },
    requestMapSwitch: vi.fn(),
    setChatOpen: vi.fn(),
    subscribe: vi.fn((topic, handler) => {
      handlers.set(topic, [...(handlers.get(topic) ?? []), handler]);
      return () => {
        handlers.set(
          topic,
          (handlers.get(topic) ?? []).filter((entry) => entry !== handler),
        );
      };
    }),
    publishToSubscribers: (topic, event) => {
      for (const handler of handlers.get(topic) ?? []) handler(event);
    },
  };
});

vi.mock("./world/maps", () => ({
  getDefaultMap: vi.fn(() => ({
    id: "default",
    name: "Default",
    range: "0-0",
  })),
  listMaps: vi.fn(() => [
    {
      id: "default",
      name: "Default",
      range: "0-0",
    },
  ]),
}));

const CONTACT = {
  id: "dwelling-redwood",
  contactId: "contact-elowen",
  name: "Redwood Cottage",
  contact: "Elowen",
  role: "Herbalist",
};

const OTHER_CONTACT = {
  id: "dwelling-rowan",
  contactId: "contact-rowan",
  name: "Rowan Lodge",
  contact: "Rowan",
  role: "Carpenter",
};

// Delivers an interaction the way the Phaser side does: one bridge event whose
// payload carries the dwelling's resident data.
const openChat = (dwelling = CONTACT) =>
  act(() => {
    publishToSubscribers(EventType.DWELLING_INTERACT, {
      type: EventType.DWELLING_INTERACT,
      dwelling,
    });
  });

const closeButton = () =>
  screen.getByRole("button", { name: /close conversation/i });

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the main application UI", () => {
    render(createElement(App));

    expect(
      screen.getByRole("heading", { name: /dwelling/i }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/switch map/i)).toBeInTheDocument();
  });

  it("opens the drawer for the resident in the interaction payload", () => {
    render(createElement(App));

    openChat();

    expect(
      screen.getByRole("heading", { name: /redwood cottage/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/resident: elowen/i)).toBeInTheDocument();
  });

  it("opens the resident that owns the interacting dwelling", () => {
    render(createElement(App));

    openChat(OTHER_CONTACT);

    expect(
      screen.getByRole("heading", { name: /rowan lodge/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/resident: rowan/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /redwood cottage/i }),
    ).not.toBeInTheDocument();
  });

  it("ignores an interaction without dwelling data", () => {
    render(createElement(App));

    act(() => {
      publishToSubscribers(EventType.DWELLING_INTERACT, {
        type: EventType.DWELLING_INTERACT,
      });
    });

    expect(
      screen.queryByRole("heading", { name: /redwood cottage/i }),
    ).not.toBeInTheDocument();
  });

  it("does not listen for the removed window CustomEvent", () => {
    render(createElement(App));

    act(() => {
      window.dispatchEvent(
        new CustomEvent("dwelling:open-chat", { detail: CONTACT }),
      );
    });

    expect(
      screen.queryByRole("heading", { name: /redwood cottage/i }),
    ).not.toBeInTheDocument();
  });

  it("publishes chat visibility when the drawer opens", () => {
    render(createElement(App));
    setChatOpen.mockClear();

    openChat();

    expect(setChatOpen).toHaveBeenCalledTimes(1);
    expect(setChatOpen).toHaveBeenLastCalledWith(true);
  });

  it("publishes chat visibility when the drawer closes", () => {
    render(createElement(App));
    openChat();
    setChatOpen.mockClear();

    fireEvent.click(closeButton());

    expect(
      screen.queryByRole("heading", { name: /redwood cottage/i }),
    ).not.toBeInTheDocument();
    expect(setChatOpen).toHaveBeenCalledTimes(1);
    expect(setChatOpen).toHaveBeenLastCalledWith(false);
  });

  it("publishes chat visibility when Escape closes the drawer", () => {
    render(createElement(App));
    openChat();
    setChatOpen.mockClear();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("heading", { name: /redwood cottage/i }),
    ).not.toBeInTheDocument();
    expect(setChatOpen).toHaveBeenCalledTimes(1);
    expect(setChatOpen).toHaveBeenLastCalledWith(false);
  });

  it("keeps one subscription per topic and one publication per open/close cycle", () => {
    render(createElement(App));
    setChatOpen.mockClear();

    for (let cycle = 0; cycle < 10; cycle += 1) {
      openChat();
      fireEvent.click(closeButton());
    }

    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(subscribe.mock.calls.map(([topic]) => topic).sort()).toEqual(
      [EventType.DWELLING_INTERACT, EventType.MAP_CHANGED].sort(),
    );
    expect(setChatOpen).toHaveBeenCalledTimes(20);
    expect(setChatOpen.mock.calls.map(([open]) => open)).toEqual(
      Array.from({ length: 10 }, () => [true, false]).flat(),
    );
  });

  describe("drawer focus management", () => {
    const mapPicker = () => screen.getByLabelText(/switch map/i);

    const drawer = () => document.querySelector(".chat-drawer");

    it("moves focus to the close button when the drawer opens", () => {
      render(createElement(App));

      openChat();

      expect(closeButton()).toHaveFocus();
    });

    it("keeps Tab focus inside the drawer", () => {
      render(createElement(App));
      openChat();

      expect(closeButton()).toHaveFocus();

      fireEvent.keyDown(document, { key: "Tab" });
      expect(closeButton()).toHaveFocus();

      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(closeButton()).toHaveFocus();
    });

    it("pulls focus back into the drawer when it starts outside", () => {
      render(createElement(App));
      openChat();

      mapPicker().focus();
      expect(mapPicker()).toHaveFocus();

      fireEvent.keyDown(document, { key: "Tab" });

      expect(closeButton()).toHaveFocus();
    });

    it("returns focus to the opener when Escape closes the drawer", () => {
      render(createElement(App));
      mapPicker().focus();

      openChat();
      expect(closeButton()).toHaveFocus();

      fireEvent.keyDown(window, { key: "Escape" });

      expect(drawer()).toHaveAttribute("inert");
      expect(mapPicker()).toHaveFocus();
    });

    it("returns focus to the opener when the close button is used", () => {
      render(createElement(App));
      mapPicker().focus();
      openChat();

      fireEvent.click(closeButton());

      expect(mapPicker()).toHaveFocus();
    });

    it("falls back to focusing the game canvas when nothing else had focus", () => {
      render(createElement(App));
      const canvas = document.createElement("canvas");
      document.querySelector(".world-mount").append(canvas);

      openChat();
      fireEvent.click(closeButton());

      expect(canvas).toHaveFocus();
      expect(canvas).not.toHaveAttribute("tabindex", "0");
    });

    it("stops trapping Tab once the drawer is closed", () => {
      render(createElement(App));
      openChat();
      fireEvent.click(closeButton());

      mapPicker().focus();
      fireEvent.keyDown(document, { key: "Tab" });

      expect(mapPicker()).toHaveFocus();
    });

    it("removes its window listeners when the app unmounts", () => {
      const { unmount } = render(createElement(App));
      openChat();
      setChatOpen.mockClear();

      unmount();
      fireEvent.keyDown(window, { key: "Escape" });

      expect(setChatOpen).not.toHaveBeenCalled();
    });

    it("marks the closed drawer inert and hidden from assistive tech", () => {
      render(createElement(App));

      expect(drawer()).toHaveAttribute("inert");
      expect(drawer()).toHaveAttribute("aria-hidden", "true");
      expect(drawer()).toHaveAttribute("role", "dialog");

      openChat();

      expect(drawer()).not.toHaveAttribute("inert");
      expect(drawer()).toHaveAttribute("aria-hidden", "false");
    });
  });
});
