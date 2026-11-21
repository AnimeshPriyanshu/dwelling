import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, setUnauthorizedHandler } from "./client";

const fetchMock = vi.fn();

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  setUnauthorizedHandler(null);
});

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.unstubAllGlobals();
});

describe("API unauthorized handling", () => {
  it("notifies the app when an API request returns 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(
      response(401, { code: "AUTH_REQUIRED", message: "Sign in is required." }),
    );

    await expect(api.contacts()).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not treat other client errors as an expired session", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(
      response(400, { code: "VALIDATION_FAILED", message: "Invalid input." }),
    );

    await expect(api.addContact("")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
