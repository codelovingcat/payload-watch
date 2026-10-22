import { describe, expect, it } from "vitest";
import { comparePayloads } from "../src/index.js";
import type { JsonValue } from "../src/index.js";

describe("comparePayloads regression cases", () => {
  it("treats empty objects and nested empty JSON containers as equal", () => {
    expect(comparePayloads({}, {})).toEqual({ changes: [] });
    expect(comparePayloads({ emptyObject: {}, emptyArray: [] }, { emptyArray: [], emptyObject: {} })).toEqual({ changes: [] });
    expect(comparePayloads([{}, [], null], [null, [], {}])).not.toEqual({ changes: [] });
  });

  it("supports all JSON root value kinds without coercion", () => {
    const equalValues: JsonValue[] = [null, true, false, 0, 1.5, "", "json text", [], {}, [1, "two"], { nested: true }];

    for (const value of equalValues) {
      expect(comparePayloads(value, structuredClone(value))).toEqual({ changes: [] });
    }

    expect(comparePayloads("42", 42).changes).toEqual([
      { kind: "type-changed", path: "", previousType: "string", currentType: "number" },
    ]);
    expect(comparePayloads("{}", "[]").changes).toEqual([
      { kind: "value-changed", path: "", previousType: "string", currentType: "string" },
    ]);
  });

  it("reports boolean value changes without treating booleans as numbers", () => {
    expect(comparePayloads(false, true).changes).toEqual([
      { kind: "value-changed", path: "", previousType: "boolean", currentType: "boolean" },
    ]);
    expect(comparePayloads(true, 1).changes).toEqual([
      { kind: "type-changed", path: "", previousType: "boolean", currentType: "number" },
    ]);
  });

  it("reports object-to-array and array-to-object transitions at the affected node", () => {
    expect(comparePayloads({ result: { id: 1 } }, { result: [1] }).changes).toEqual([
      { kind: "type-changed", path: "/result", previousType: "object", currentType: "array" },
    ]);
    expect(comparePayloads({ result: [1] }, { result: { id: 1 } }).changes).toEqual([
      { kind: "type-changed", path: "/result", previousType: "array", currentType: "object" },
    ]);
  });

  it("keeps a missing property distinct from an explicit null in both directions", () => {
    expect(comparePayloads({}, { value: null }).changes).toEqual([
      { kind: "added", path: "/value", currentType: "null" },
    ]);
    expect(comparePayloads({ value: null }, {}).changes).toEqual([
      { kind: "removed", path: "/value", previousType: "null" },
    ]);
  });

  it("compares literal dotted keys differently from nested keys", () => {
    expect(comparePayloads({ "a.b": 1 }, { "a.b": 2 }).changes[0]?.path).toBe("/a.b");
    expect(comparePayloads({ a: { b: 1 } }, { a: { b: 2 } }).changes[0]?.path).toBe("/a/b");
  });

  it.each([
    ["display name", "/display name"],
    ["0", "/0"],
    ["items[0]", "/items[0]"],
    ['say"hello', '/say"hello'],
    ["", "/"],
  ])("preserves JSON Pointer segments for unusual key %j", (key, expectedPath) => {
    const previous = { [key]: "before" };
    const current = { [key]: "after" };

    expect(comparePayloads(previous, current).changes[0]?.path).toBe(expectedPath);
  });

  it("uses JSON Pointer escaping for special keys at nested levels", () => {
    expect(comparePayloads({ nested: { "a/b~c": 1 } }, { nested: { "a/b~c": 2 } }).changes[0]?.path)
      .toBe("/nested/a~1b~0c");
  });

  it("handles simultaneous array value, type, addition, and removal changes deterministically", () => {
    const previous = [1, "ready", { active: true }, "removed"];
    const current = [2, false, { active: false }, null, "added"];

    const report = comparePayloads(previous, current);
    expect(report.changes.map(({ kind, path }) => [kind, path])).toEqual([
      ["value-changed", "/0"],
      ["type-changed", "/1"],
      ["value-changed", "/2/active"],
      ["type-changed", "/3"],
      ["added", "/4"],
    ]);
  });

  it("produces byte-for-byte equivalent serialized reports across repeated comparisons", () => {
    const previous = { z: [3, { y: false, a: null }], "a.b": { value: 1 } };
    const current = { "a.b": { value: "1" }, z: [4, { a: true, y: false }, "new"] };

    const first = JSON.stringify(comparePayloads(previous, current, { includeValues: true }));
    for (let run = 0; run < 5; run += 1) {
      expect(JSON.stringify(comparePayloads(previous, current, { includeValues: true }))).toBe(first);
    }
  });

  it("does not expose old or new values by default for any change kind", () => {
    const report = comparePayloads(
      { removed: "private", stable: 1, changedType: 1 },
      { added: "private-new", stable: 2, changedType: "1" },
    );

    expect(report.changes).toEqual([
      { kind: "added", path: "/added", currentType: "string" },
      { kind: "type-changed", path: "/changedType", previousType: "number", currentType: "string" },
      { kind: "removed", path: "/removed", previousType: "string" },
      { kind: "value-changed", path: "/stable", previousType: "number", currentType: "number" },
    ]);
    expect(JSON.stringify(report)).not.toContain("private");
  });

  it("does not mutate inputs when the same nested value is compared repeatedly", () => {
    const previous = { data: [{ key: "old" }, { count: 1 }], retain: { empty: {} } };
    const current = { data: [{ key: "new" }, { count: 2 }, null], retain: { empty: {} } };
    const previousSnapshot = structuredClone(previous);
    const currentSnapshot = structuredClone(current);

    for (let run = 0; run < 3; run += 1) {
      comparePayloads(previous, current, { includeValues: true });
    }

    expect(previous).toEqual(previousSnapshot);
    expect(current).toEqual(currentSnapshot);
  });
});
