import { describe, expect, it } from "vitest";
import { comparePayloads } from "../src/index.js";
import type { CompareOptions } from "../src/index.js";

describe("exact ignore paths", () => {
  it("keeps the default behavior", () => {
    expect(comparePayloads({ id: 1 }, { id: 2 }).changes.map(c => c.path)).toEqual(["/id"]);
  });
  it("ignores nested values but not adjacent fields or prefixes", () => {
    const a = { meta: { requestId: "a", state: "up" }, id: 1, identity: 1 };
    const b = { meta: { requestId: "b", state: "down" }, id: 2, identity: 2 };
    expect(comparePayloads(a, b, { ignorePaths: ["/meta/requestId", "/id"] }).changes.map(c => c.path))
      .toEqual(["/identity", "/meta/state"]);
  });
  it("handles array additions and removals by position", () => {
    expect(comparePayloads([1], [2, 3], { ignorePaths: ["/0", "/1"] })).toEqual({ changes: [] });
    expect(comparePayloads([1, 2], [1], { ignorePaths: ["/1"] })).toEqual({ changes: [] });
  });
  it("ignores a parent subtree but not a changed ancestor", () => {
    expect(comparePayloads({ data: { x: 1 }, keep: 1 }, { data: { x: 2, y: 1 }, keep: 2 }, { ignorePaths: ["/data"] }).changes.map(c => c.path))
      .toEqual(["/keep"]);
    expect(comparePayloads({ a: { x: 1 } }, { a: null }, { ignorePaths: ["/a/x"] }).changes)
      .toEqual([{ kind: "type-changed", path: "/a", previousType: "object", currentType: "null" }]);
  });
  it("uses escaped RFC 6901 paths", () => {
    const a = { "a/b": { "~": 1, other: 1 } };
    const b = { "a/b": { "~": 2, other: 2 } };
    expect(comparePayloads(a, b, { ignorePaths: ["/a~1b/~0"] }).changes.map(c => c.path))
      .toEqual(["/a~1b/other"]);
  });
  it("supports explicit root and overlapping rules", () => {
    expect(comparePayloads({ x: 1 }, { x: 2 }, { ignorePaths: [""] })).toEqual({ changes: [] });
    expect(comparePayloads({ a: { x: 1 } }, { a: { x: 2 } }, { ignorePaths: ["/a", "/a/x"] })).toEqual({ changes: [] });
  });
  it("rejects malformed or duplicate rules", () => {
    for (const bad of [["x"], ["/bad~9"], ["/id", "/id"], [null], [12], "abc"]) {
      expect(() => comparePayloads({}, {}, { ignorePaths: bad } as unknown as CompareOptions)).toThrow(TypeError);
    }
  });
  it("preserves privacy defaults and inputs", () => {
    const a = { token: "first", id: 1 };
    const b = { token: "second", id: 2 };
    expect(comparePayloads(a, b, { ignorePaths: ["/token"] }).changes)
      .toEqual([{ kind: "value-changed", path: "/id", previousType: "number", currentType: "number" }]);
    expect(a.token).toBe("first");
  });
});
