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
import { setChatOpen, subscribe } from "./bridge";

const { bridgeHandlers } = vi.hoisted(() => ({ bridgeHandlers: new Map() }));

vi.mock("./world/game", () => ({
  createGame: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

vi.mock("./bridge", () => ({
  EventType: {
    DWELLING_INTERACT: "dwelling:interact",
    MAP_CHANGED: "map:changed",
    UI_STATE: "ui:state",
  },
  requestMapSwitch: vi.fn(),
  setChatOpen: vi.fn(),
  subscribe: vi.fn(),
}));

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

const emitDwellingInteract = (detail = CONTACT) =>
  act(() => {
    for (const handler of bridgeHandlers.get("dwelling:interact") ?? []) {
      handler({ type: "dwelling:interact", ...detail });
    }
  });

const closeButton = () =>
  screen.getByRole("button", { name: /close conversation/i });

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bridgeHandlers.clear();
    subscribe.mockImplementation((topic, handler) => {
      const handlers = bridgeHandlers.get(topic) ?? [];
      handlers.push(handler);
      bridgeHandlers.set(topic, handlers);

      return () => {
        bridgeHandlers.set(
          topic,
          (bridgeHandlers.get(topic) ?? []).filter(
            (entry) => entry !== handler,
          ),
        );
      };
    });
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

  it("opens the drawer from a bridge interaction", () => {
    render(createElement(App));
    setChatOpen.mockClear();

    emitDwellingInteract();

    expect(
      screen.getByRole("heading", { name: /redwood cottage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/resident: elowen \(herbalist\)/i),
    ).toBeInTheDocument();
    expect(setChatOpen).toHaveBeenCalledTimes(1);
    expect(setChatOpen).toHaveBeenLastCalledWith(true);
  });

  it("opens the drawer for whichever dwelling interacted", () => {
    render(createElement(App));
    emitDwellingInteract();
    fireEvent.click(closeButton());

    emitDwellingInteract({
      id: "dwelling-willow",
      contactId: "contact-rowan",
      name: "Willow Studio",
      contact: "Rowan",
      role: "Carpenter",
    });

    expect(
      screen.getByRole("heading", { name: /willow studio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/resident: rowan \(carpenter\)/i),
    ).toBeInTheDocument();
  });

  it("publishes chat visibility when the drawer closes", () => {
    render(createElement(App));
    emitDwellingInteract();
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
    emitDwellingInteract();
    setChatOpen.mockClear();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("heading", { name: /redwood cottage/i }),
    ).not.toBeInTheDocument();
    expect(setChatOpen).toHaveBeenCalledTimes(1);
    expect(setChatOpen).toHaveBeenLastCalledWith(false);
  });

  it("keeps one subscription per topic across repeated interactions", () => {
    render(createElement(App));
    setChatOpen.mockClear();

    for (let cycle = 0; cycle < 10; cycle += 1) {
      emitDwellingInteract();
      fireEvent.click(closeButton());
    }

    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(bridgeHandlers.get("dwelling:interact")).toHaveLength(1);
    expect(bridgeHandlers.get("map:changed")).toHaveLength(1);
    expect(setChatOpen).toHaveBeenCalledTimes(20);
    expect(setChatOpen.mock.calls.map(([open]) => open)).toEqual(
      Array.from({ length: 10 }, () => [true, false]).flat(),
    );
  });

  it("unsubscribes from the bridge on unmount", () => {
    const { unmount } = render(createElement(App));

    expect(bridgeHandlers.get("dwelling:interact")).toHaveLength(1);

    unmount();

    expect(bridgeHandlers.get("dwelling:interact")).toHaveLength(0);
    expect(bridgeHandlers.get("map:changed")).toHaveLength(0);
  });
});
