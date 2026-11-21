import { beforeEach, describe, expect, it, vi } from "vitest";

const { ioMock, socketMock, notifyUnauthorized } = vi.hoisted(() => {
  const socket = { on: vi.fn() };
  return {
    socketMock: socket,
    ioMock: vi.fn(() => socket),
    notifyUnauthorized: vi.fn(),
  };
});

vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("./client", () => ({ notifyUnauthorized }));

import { connectSocket } from "./socket";

beforeEach(() => {
  notifyUnauthorized.mockReset();
});

describe("socket authentication failure", () => {
  it("reports AUTH_REQUIRED to the central session handler", () => {
    connectSocket();

    const connectError = socketMock.on.mock.calls.find(
      ([event]) => event === "connect_error",
    )[1];

    connectError(new Error("AUTH_REQUIRED"));
    expect(notifyUnauthorized).toHaveBeenCalledTimes(1);

    notifyUnauthorized.mockReset();
    connectError(
      Object.assign(new Error("Authentication failed"), {
        data: { code: "AUTH_REQUIRED" },
      }),
    );
    expect(notifyUnauthorized).toHaveBeenCalledTimes(1);

    notifyUnauthorized.mockReset();
    connectError(new Error("TRANSPORT_ERROR"));
    expect(notifyUnauthorized).not.toHaveBeenCalled();
  });
});
