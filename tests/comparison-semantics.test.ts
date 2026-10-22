import { describe, expect, it } from "vitest";
import { comparePayloads } from "../src/index.js";

describe("documented comparison semantics", () => {
  it("keeps equal JSON primitives equal", () => {
    for (const value of [null, true, false, 0, -0, 42, 1.25, "", "ready"] as const) {
      expect(comparePayloads(value, value)).toEqual({ changes: [] });
    }
  });

  it("does not coerce numbers, strings, or booleans", () => {
    expect(comparePayloads(42, "42").changes).toEqual([
      { kind: "type-changed", path: "", previousType: "number", currentType: "string" },
    ]);
    expect(comparePayloads("42", 42).changes).toEqual([
      { kind: "type-changed", path: "", previousType: "string", currentType: "number" },
    ]);
    expect(comparePayloads(false, 0).changes).toEqual([
      { kind: "type-changed", path: "", previousType: "boolean", currentType: "number" },
    ]);
  });

  it("compares objects structurally regardless of property insertion order", () => {
    expect(comparePayloads(
      { a: 1, nested: { first: true, second: "ok" } },
      { nested: { second: "ok", first: true }, a: 1 },
    )).toEqual({ changes: [] });
  });

  it("treats matching empty objects and arrays as equal", () => {
    expect(comparePayloads({}, {})).toEqual({ changes: [] });
    expect(comparePayloads([], [])).toEqual({ changes: [] });
    expect(comparePayloads({ nested: {} }, { nested: {} })).toEqual({ changes: [] });
    expect(comparePayloads({ nested: [] }, { nested: [] })).toEqual({ changes: [] });
  });

  it("distinguishes missing properties from explicit null in both directions", () => {
    expect(comparePayloads({}, { nickname: null }).changes).toEqual([
      { kind: "added", path: "/nickname", currentType: "null" },
    ]);
    expect(comparePayloads({ nickname: null }, {}).changes).toEqual([
      { kind: "removed", path: "/nickname", previousType: "null" },
    ]);
  });

  it("reports object-array transitions once at the changed node", () => {
    expect(comparePayloads(
      { payload: { id: 1 } },
      { payload: [{ id: 1 }] },
    ).changes).toEqual([
      { kind: "type-changed", path: "/payload", previousType: "object", currentType: "array" },
    ]);
    expect(comparePayloads({}, []).changes).toEqual([
      { kind: "type-changed", path: "", previousType: "object", currentType: "array" },
    ]);
  });

  it("reports a nested primitive change at its JSON Pointer path", () => {
    expect(comparePayloads(
      { customer: { active: true } },
      { customer: { active: false } },
    ).changes).toEqual([
      {
        kind: "value-changed",
        path: "/customer/active",
        previousType: "boolean",
        currentType: "boolean",
      },
    ]);
  });

  it("does not parse JSON text implicitly", () => {
    expect(comparePayloads('{"id":1}', { id: 1 }).changes).toEqual([
      { kind: "type-changed", path: "", previousType: "string", currentType: "object" },
    ]);
  });
});
