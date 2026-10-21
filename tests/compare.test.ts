import { describe, expect, it } from "vitest";
import { comparePayloads } from "../src/compare.js";

describe("comparePayloads", () => {
  it("returns no changes for equal primitive values", () => {
    expect(comparePayloads("ready", "ready")).toEqual({ changes: [] });
    expect(comparePayloads(42, 42)).toEqual({ changes: [] });
    expect(comparePayloads(null, null)).toEqual({ changes: [] });
  });

  it("returns no changes for equivalent objects regardless of insertion order", () => {
    const previous = { status: "ready", customer: { id: 7, active: true } };
    const current = { customer: { active: true, id: 7 }, status: "ready" };

    expect(comparePayloads(previous, current)).toEqual({ changes: [] });
  });

  it("reports a primitive value change without including values by default", () => {
    expect(comparePayloads("ready", "pending")).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "",
          previousType: "string",
          currentType: "string",
        },
      ],
    });
  });

  it("includes before and after primitive values only when requested", () => {
    expect(comparePayloads(10, 12, { includeValues: true })).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "",
          previousType: "number",
          currentType: "number",
          values: { previous: 10, current: 12 },
        },
      ],
    });
  });

  it("reports added and removed object properties with their types", () => {
    expect(
      comparePayloads(
        { keep: true, removed: 3 },
        { added: "new", keep: true },
      ),
    ).toEqual({
      changes: [
        {
          kind: "added",
          path: "/added",
          currentType: "string",
        },
        {
          kind: "removed",
          path: "/removed",
          previousType: "number",
        },
      ],
    });
  });

  it("includes added and removed values only when requested", () => {
    expect(
      comparePayloads(
        { removed: { id: 4 } },
        { added: [1, 2] },
        { includeValues: true },
      ),
    ).toEqual({
      changes: [
        {
          kind: "added",
          path: "/added",
          currentType: "array",
          values: { current: [1, 2] },
        },
        {
          kind: "removed",
          path: "/removed",
          previousType: "object",
          values: { previous: { id: 4 } },
        },
      ],
    });
  });

  it("recurses into nested objects and reports the precise path", () => {
    expect(
      comparePayloads(
        { customer: { profile: { name: "Deniz" } } },
        { customer: { profile: { name: "Ece" } } },
        { includeValues: true },
      ),
    ).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "/customer/profile/name",
          previousType: "string",
          currentType: "string",
          values: { previous: "Deniz", current: "Ece" },
        },
      ],
    });
  });

  it("reports JSON type changes instead of reporting descendants too", () => {
    expect(
      comparePayloads(
        { customer: { id: 7, name: "Deniz" } },
        { customer: null },
      ),
    ).toEqual({
      changes: [
        {
          kind: "type-changed",
          path: "/customer",
          previousType: "object",
          currentType: "null",
        },
      ],
    });
  });

  it("detects type changes involving arrays and the root value", () => {
    expect(comparePayloads({}, [])).toEqual({
      changes: [
        {
          kind: "type-changed",
          path: "",
          previousType: "object",
          currentType: "array",
        },
      ],
    });
  });

  it("distinguishes a missing property from a property set to null", () => {
    expect(comparePayloads({}, { nickname: null })).toEqual({
      changes: [
        {
          kind: "added",
          path: "/nickname",
          currentType: "null",
        },
      ],
    });
  });

  it("escapes slash and tilde in property names using JSON Pointer rules", () => {
    expect(
      comparePayloads({ "a/b~c": "old" }, { "a/b~c": "new" }),
    ).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "/a~1b~0c",
          previousType: "string",
          currentType: "string",
        },
      ],
    });
  });

  it("returns changes in deterministic depth-first order", () => {
    const previous = {
      z: 1,
      a: { n: 1, m: 2 },
      b: 5,
    };
    const current = {
      z: 2,
      a: { n: 3, m: 4 },
      c: 6,
    };

    expect(comparePayloads(previous, current).changes.map((change) => change.path)).toEqual([
      "/a/m",
      "/a/n",
      "/b",
      "/c",
      "/z",
    ]);
  });

  it("does not mutate either input", () => {
    const previous = { nested: { value: 1 }, removed: "old" };
    const current = { nested: { value: 2 }, added: "new" };
    const previousSnapshot = structuredClone(previous);
    const currentSnapshot = structuredClone(current);

    comparePayloads(previous, current, { includeValues: true });

    expect(previous).toEqual(previousSnapshot);
    expect(current).toEqual(currentSnapshot);
  });
});
