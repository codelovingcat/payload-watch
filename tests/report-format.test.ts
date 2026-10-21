import { describe, expect, it } from "vitest";
import { comparePayloads, formatComparisonReport } from "../src/index.js";

describe("formatComparisonReport", () => {
  it("returns a clear message for an empty report", () => {
    expect(formatComparisonReport({ changes: [] })).toBe("No changes detected.");
  });

  it("formats one change with the path and type metadata", () => {
    const report = comparePayloads({}, { email: "dev@example.com" });

    expect(formatComparisonReport(report)).toBe(
      "1 change detected:\n1. Added value at /email (current type: string)",
    );
  });

  it("formats multiple changes in the original stable report order", () => {
    const report = comparePayloads(
      { id: 12, status: "ready", removed: true },
      { id: "12", status: "pending", added: null },
    );

    expect(formatComparisonReport(report)).toBe(
      "4 changes detected:\n" +
      "1. Added value at /added (current type: null)\n" +
      "2. Type changed at /id (number → string)\n" +
      "3. Removed value at /removed (previous type: boolean)\n" +
      "4. Value changed at /status (type: string)",
    );
  });

  it("shows type transitions clearly", () => {
    const report = comparePayloads({ id: 12 }, { id: "12" });

    expect(formatComparisonReport(report)).toBe(
      "1 change detected:\n1. Type changed at /id (number → string)",
    );
  });

  it("labels a change to the root value", () => {
    const report = comparePayloads("old", null);

    expect(formatComparisonReport(report)).toBe(
      "1 change detected:\n1. Type changed at <root> (string → null)",
    );
  });

  it("does not print before/after values by default", () => {
    const report = comparePayloads(
      { token: "old-secret" },
      { token: "new-secret" },
      { includeValues: true },
    );

    const summary = formatComparisonReport(report);

    expect(summary).toContain("Value changed at /token (type: string)");
    expect(summary).not.toContain("old-secret");
    expect(summary).not.toContain("new-secret");
  });

  it("prints values only when both the report and formatter opt in", () => {
    const report = comparePayloads("old", "new", { includeValues: true });

    expect(formatComparisonReport(report, { includeValues: true })).toBe(
      '1 change detected:\n1. Value changed at <root> (type: string) — "old" → "new"',
    );
  });

  it("does not invent values when they are absent from the structured report", () => {
    const report = comparePayloads("old", "new");

    expect(formatComparisonReport(report, { includeValues: true })).toBe(
      "1 change detected:\n1. Value changed at <root> (type: string)",
    );
  });

  it("serializes opt-in object values with recursively sorted keys", () => {
    const report = comparePayloads(
      {},
      { profile: { z: 1, a: { y: true, b: "new" } } },
      { includeValues: true },
    );

    expect(formatComparisonReport(report, { includeValues: true })).toBe(
      '1 change detected:\n' +
      '1. Added value at /profile (current type: object) — <missing> → {"a": {"b": "new", "y": true}, "z": 1}',
    );
  });

  it("renders JSON Pointer paths without changing the structured path", () => {
    const report = comparePayloads({ "a/b": 1 }, { "a/b": 2 });

    expect(report.changes[0]?.path).toBe("/a~1b");
    expect(formatComparisonReport(report)).toContain("Value changed at /a~1b");
  });

  it("does not mutate the structured report", () => {
    const report = comparePayloads(
      { data: { z: 1, a: 2 } },
      { data: { z: 3, a: 4 } },
      { includeValues: true },
    );
    const beforeFormatting = structuredClone(report);

    formatComparisonReport(report);
    formatComparisonReport(report, { includeValues: true });

    expect(report).toEqual(beforeFormatting);
  });
});
