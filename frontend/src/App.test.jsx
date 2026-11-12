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

vi.mock("./world/game", () => ({
  createGame: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

vi.mock("./bridge", () => ({
  EventType: {
    MAP_CHANGED: "map:changed",
    UI_STATE: "ui:state",
  },
  requestMapSwitch: vi.fn(),
  setChatOpen: vi.fn(),
  subscribe: vi.fn(() => () => {}),
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

const openChat = (detail = CONTACT) =>
  act(() => {
    window.dispatchEvent(new CustomEvent("dwelling:open-chat", { detail }));
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

  it("publishes chat visibility when the drawer opens", () => {
    render(createElement(App));
    setChatOpen.mockClear();

    openChat();

    expect(
      screen.getByRole("heading", { name: /redwood cottage/i }),
    ).toBeInTheDocument();
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

  it("keeps one bridge subscription and one publication per open/close cycle", () => {
    render(createElement(App));
    setChatOpen.mockClear();

    for (let cycle = 0; cycle < 10; cycle += 1) {
      openChat();
      fireEvent.click(closeButton());
    }

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(setChatOpen).toHaveBeenCalledTimes(20);
    expect(setChatOpen.mock.calls.map(([open]) => open)).toEqual(
      Array.from({ length: 10 }, () => [true, false]).flat(),
    );
  });
});
