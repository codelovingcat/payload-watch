import { describe, expect, it } from "vitest";
import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "../src/index.js";
import type { JsonValue } from "../src/index.js";

const unsafe = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;
const controls = "\u0000\n\r\t\u001b\u007f\u0085\u009b\u061c\u200e\u200f\u2028\u2029\u202a\u202e\u2066\u2069";

describe("human-readable output safety", () => {
  it("escapes opt-in nested keys and values while preserving their JSON meaning", () => {
    const data = {
      ["key" + controls]: "value" + controls,
      nested: ["İstanbul 雪 😀", "literal\\u009b", "literal\\n", "quoted\"text"],
    };
    const report = comparePayloads({}, { data }, { includeValues: true });
    const original = structuredClone(report);
    const text = formatComparisonReport(report, { includeValues: true });
    expect(text).not.toMatch(unsafe);
    expect(text.split("\n")).toHaveLength(2);
    const marker = " — <missing> → ";
    const rendered = text.slice(text.indexOf(marker) + marker.length);
    expect(JSON.parse(rendered)).toEqual(data);
    expect(report).toEqual(original);
    expect(formatComparisonReport(report)).not.toContain("İstanbul");
  });

  it("escapes values for every change kind without changing the structured values", () => {
    const cases: [JsonValue, JsonValue][] = [
      [{}, { value: controls }],
      [{ value: controls }, {}],
      [controls, "next" + controls],
      [controls, [controls]],
    ];
    for (const [previous, current] of cases) {
      const report = comparePayloads(previous, current, { includeValues: true });
      const before = structuredClone(report);
      const text = formatComparisonReport(report, { includeValues: true });
      expect(text).not.toMatch(unsafe);
      expect(text.split("\n")).toHaveLength(2);
      expect(report).toEqual(before);
    }
  });

  it("escapes directional marks in displayed paths while retaining canonical pointers", () => {
    const key = "field\u061c\u200e\u200f";
    const report = comparePayloads({ [key]: 1 }, { [key]: 2 });
    expect(report.changes[0]?.path).toBe("/" + key);
    expect(formatComparisonReport(report)).toContain("/field\\u061c\\u200e\\u200f");
    expect(formatComparisonReport(report)).not.toMatch(unsafe);
  });

  it("escapes validation error messages and stacks without changing error.path", () => {
    const key = "invalid" + controls;
    let error: unknown;
    try { comparePayloads({}, { [key]: Number.NaN }); }
    catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(InvalidJsonInputError);
    if (!(error instanceof InvalidJsonInputError)) throw new Error("Expected typed error");
    expect(error.path).toBe("/" + key);
    expect(error.message).not.toMatch(unsafe);
    expect(error.message.split("\n")).toHaveLength(1);
    expect(error.stack).not.toMatch(unsafe);
    expect(error.message).toContain("\\u009b");
  });
});
