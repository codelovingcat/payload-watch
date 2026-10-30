import { describe, expect, it } from "vitest";
import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "../src/index.js";
import type { JsonValue } from "../src/index.js";

function nested(depth: number, leaf: JsonValue, kind: "object" | "array"): JsonValue {
  let value = leaf;
  for (let i = 0; i < depth; i += 1) value = kind === "array" ? [value] : { child: value };
  return value;
}

function expectDepthError(previous: JsonValue, current: JsonValue, input: string, path: string): void {
  let error: unknown;
  try { comparePayloads(previous, current); } catch (caught) { error = caught; }
  expect(error).toBeInstanceOf(InvalidJsonInputError);
  if (!(error instanceof InvalidJsonInputError)) throw new Error("Expected typed depth error");
  expect(error.input).toBe(input);
  expect(error.path).toBe(path);
  expect(error.reason).toBe("maximum nesting depth of 512 exceeded (root depth is 0)");
  expect(error.message).not.toContain("private-depth-value");
}

describe("JSON nesting boundary", () => {
  for (const kind of ["object", "array"] as const) {
    const segment = kind === "object" ? "/child" : "/0";

    it(`accepts ${kind} leaves and empty containers at depth 512`, () => {
      const previous = nested(512, 1, kind), current = nested(512, 2, kind);
      expect(comparePayloads(previous, current).changes).toEqual([
        { kind: "value-changed", path: segment.repeat(512), previousType: "number", currentType: "number" },
      ]);
      const empty = nested(512, kind === "object" ? {} : [], kind);
      expect(comparePayloads(empty, empty)).toEqual({ changes: [] });
    });

    it(`rejects ${kind} depth 513 in either input with an actionable error`, () => {
      const deep = nested(513, "private-depth-value", kind);
      expectDepthError(deep, null, "previousPayload", segment.repeat(513));
      expectDepthError(null, deep, "currentPayload", segment.repeat(513));
    });

    it(`clones and formats supported-depth ${kind} values`, () => {
      const input = nested(512, "leaf", kind);
      const report = comparePayloads(null, input, { includeValues: true });
      const change = report.changes[0];
      if (change?.kind !== "type-changed" || !change.values) throw new Error("Expected root type change");
      expect(change.values.current).not.toBe(input);
      expect(JSON.stringify(change.values.current)).toBe(JSON.stringify(input));
      const text = formatComparisonReport(report, { includeValues: true });
      const marker = " — null → ";
      expect(JSON.stringify(JSON.parse(text.slice(text.indexOf(marker) + marker.length)))).toBe(JSON.stringify(input));
    });
  }

  it("rejects a parsed 5,000-level document before exhausting the call stack", () => {
    const deep = JSON.parse('{"x":'.repeat(5000) + '"private-depth-value"' + '}'.repeat(5000)) as JsonValue;
    expectDepthError({}, deep, "currentPayload", "/x".repeat(513));
  });

  it("validates ignored subtrees and counts path segments rather than slash characters", () => {
    const deep = nested(513, 0, "object");
    expect(() => comparePayloads(deep, null, { ignorePaths: [""] })).toThrow(InvalidJsonInputError);
    const key = "/".repeat(600);
    expect(comparePayloads({ [key]: 1 }, { [key]: 1 })).toEqual({ changes: [] });
  });
});
