import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./world/game", () => ({
  createGame: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

vi.mock("./bridge", () => ({
  EventType: {
    MAP_CHANGED: "map:changed",
  },
  requestMapSwitch: vi.fn(),
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

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the main application UI", () => {
    render(createElement(App));

    expect(
      screen.getByRole("heading", { name: /dwelling/i }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/switch map/i)).toBeInTheDocument();
  });
});
