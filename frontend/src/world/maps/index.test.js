import { afterEach, describe, expect, it, vi } from "vitest";
import aC from "./a-c";
import sU from "./s-u";
import {
  DEFAULT_MAP_ID,
  getDefaultMap,
  getMap,
  hasMap,
  listMaps,
  registerMap,
  summarizeMap,
  validateMap,
} from "./index";

const REGISTERED = [aC, sU];

describe("map registry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists every registered map as a plain summary", () => {
    expect(listMaps()).toEqual(REGISTERED.map(summarizeMap));
  });

  it("lists summaries only, without mutable map internals", () => {
    for (const summary of listMaps()) {
      expect(Object.keys(summary).sort()).toEqual(["id", "name", "range"]);
    }
  });

  it("returns the registered map object by id", () => {
    expect(getMap("a-c")).toBe(aC);
    expect(getMap("s-u")).toBe(sU);
  });

  it("returns null for unknown or non-string ids", () => {
    expect(getMap("z-z")).toBeNull();
    expect(getMap("A-C")).toBeNull();
    expect(getMap()).toBeNull();
    expect(getMap(null)).toBeNull();
    expect(getMap(42)).toBeNull();
  });

  it("reports whether an id is registered", () => {
    expect(hasMap("a-c")).toBe(true);
    expect(hasMap("z-z")).toBe(false);
    expect(hasMap(undefined)).toBe(false);
  });

  it("boots on the default map", () => {
    expect(DEFAULT_MAP_ID).toBe("a-c");
    expect(hasMap(DEFAULT_MAP_ID)).toBe(true);
    expect(getDefaultMap()).toBe(aC);
  });

  it("summarises metadata without exposing the map data", () => {
    expect(summarizeMap(aC)).toEqual({
      id: aC.id,
      name: aC.name,
      range: aC.range,
    });
  });

  it("keeps every registered map valid", () => {
    for (const map of REGISTERED) {
      expect(validateMap(map)).toEqual([]);
    }
  });

  it("keeps map, dwelling and contact ids unique across the registry", () => {
    const mapIds = REGISTERED.map(({ id }) => id);
    const dwellingIds = REGISTERED.flatMap(({ dwellings }) =>
      dwellings.map(({ id }) => id),
    );
    const contactIds = REGISTERED.flatMap(({ dwellings }) =>
      dwellings.map(({ contactId }) => contactId),
    );

    expect(new Set(mapIds).size).toBe(mapIds.length);
    expect(new Set(dwellingIds).size).toBe(dwellingIds.length);
    expect(new Set(contactIds).size).toBe(contactIds.length);
  });

  it("skips a duplicate map id instead of replacing it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(registerMap({ ...aC, name: "Impostor" })).toBe(false);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(getMap("a-c")).toBe(aC);
    expect(listMaps()).toHaveLength(REGISTERED.length);
  });

  it("rejects an invalid map instead of registering it", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(registerMap({ id: "z-z" })).toBe(false);
    expect(registerMap(null)).toBe(false);

    expect(error).toHaveBeenCalledTimes(2);
    expect(getMap("z-z")).toBeNull();
    expect(listMaps()).toHaveLength(REGISTERED.length);
  });
});
