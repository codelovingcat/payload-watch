import { describe, expect, it } from "vitest";
import { appendPointerSegment } from "../src/json-pointer.js";
import { comparePayloads } from "../src/index.js";

describe("JSON Pointer segment construction", () => {
  it("uses an empty pointer for the root value", () => {
    expect(comparePayloads("before", "after").changes).toEqual([
      { kind: "value-changed", path: "", previousType: "string", currentType: "string" },
    ]);
  });

  it("escapes tilde before slash according to RFC 6901", () => {
    expect(appendPointerSegment("", "a/~b")).toBe("/a~1~0b");
    expect(appendPointerSegment("", "~1")).toBe("/~01");
    expect(appendPointerSegment("/parent", "a/~b")).toBe("/parent/a~1~0b");
  });

  it("keeps dots literal and distinguishes a dotted key from nested keys", () => {
    expect(comparePayloads({ "a.b": 1 }, { "a.b": 2 }).changes[0]?.path).toBe("/a.b");
    expect(comparePayloads({ a: { b: 1 } }, { a: { b: 2 } }).changes[0]?.path).toBe("/a/b");
  });

  it.each([
    ["display name", "/display name"],
    ["items[0]", "/items[0]"],
    ['say"hello', '/say"hello'],
    ["0", "/0"],
    ["", "/"],
  ] as const)("preserves unusual object key %j as JSON Pointer segment", (key: string, expectedPath: string) => {
    const previous = { [key]: "before" };
    const current = { [key]: "after" };

    expect(comparePayloads(previous, current).changes[0]?.path).toBe(expectedPath);
  });

  it("encodes slash and tilde characters in nested property names", () => {
    expect(
      comparePayloads(
        { nested: { "a/b~c": 1 } },
        { nested: { "a/b~c": 2 } },
      ).changes[0]?.path,
    ).toBe("/nested/a~1b~0c");
  });

  it("uses numeric array index segments and preserves nesting", () => {
    expect(
      comparePayloads(
        { items: [{ id: "before" }] },
        { items: [{ id: "after" }] },
      ).changes[0]?.path,
    ).toBe("/items/0/id");

    expect(comparePayloads([1], [2]).changes[0]?.path).toBe("/0");
  });

  it("does not confuse a numeric-looking object key with a path-building delimiter", () => {
    expect(comparePayloads({ "0": { "1": "before" } }, { "0": { "1": "after" } }).changes[0]?.path)
      .toBe("/0/1");
  });
});
