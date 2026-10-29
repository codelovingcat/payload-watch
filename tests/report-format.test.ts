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

  it("keeps nested sensitive values out of text unless both APIs opt in", () => {
    const previous = {
      account: {
        accessToken: "previous-access-token-secret",
        profile: { privateNote: "previous-private-note-secret" },
      },
    };
    const current = {
      account: {
        accessToken: "current-access-token-secret",
        profile: { privateNote: "current-private-note-secret" },
      },
    };

    const reportWithValues = comparePayloads(previous, current, { includeValues: true });
    const defaultSummary = formatComparisonReport(reportWithValues);
    const optedInSummary = formatComparisonReport(reportWithValues, { includeValues: true });
    const reportWithoutValues = comparePayloads(previous, current);
    const formatterOnlyOptIn = formatComparisonReport(reportWithoutValues, { includeValues: true });

    expect(JSON.stringify(reportWithValues)).toContain("previous-access-token-secret");
    expect(defaultSummary).not.toContain("previous-access-token-secret");
    expect(defaultSummary).not.toContain("current-access-token-secret");
    expect(defaultSummary).not.toContain("previous-private-note-secret");
    expect(defaultSummary).not.toContain("current-private-note-secret");

    expect(optedInSummary).toContain("previous-access-token-secret");
    expect(optedInSummary).toContain("current-access-token-secret");
    expect(optedInSummary).toContain("previous-private-note-secret");
    expect(optedInSummary).toContain("current-private-note-secret");

    expect(formatterOnlyOptIn).not.toContain("previous-access-token-secret");
    expect(formatterOnlyOptIn).not.toContain("current-access-token-secret");
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

  it("escapes controls and literal backslashes in displayed JSON Pointer paths", () => {
    const previous = {
      "removed\rline": 1,
      "value\tfield": 1,
      "type\u001b[31m": 1,
      "backslash\\n": 1,
      "direction\u202e": 1,
      "next\u0085": 1,
    };
    const current = {
      "added\nforged line": 1,
      "value\tfield": 2,
      "type\u001b[31m": "1",
      "backslash\\n": 2,
      "direction\u202e": 2,
      "next\u0085": 2,
    };

    const report = comparePayloads(previous, current);
    const paths = report.changes.map((change) => change.path);
    expect(paths).toContain("/added\nforged line");
    expect(paths).toContain("/removed\rline");
    expect(paths).toContain("/value\tfield");
    expect(paths).toContain("/type\u001b[31m");
    expect(paths).toContain("/backslash\\n");
    expect(paths).toContain("/direction\u202e");
    expect(paths).toContain("/next\u0085");

    const before = structuredClone(report);
    const text = formatComparisonReport(report);
    expect(text).toContain("Added value at /added\\nforged line");
    expect(text).toContain("Removed value at /removed\\rline");
    expect(text).toContain("Value changed at /value\\tfield");
    expect(text).toContain("Type changed at /type\\u001b[31m");
    expect(text).toContain("Value changed at /backslash\\\\n");
    expect(text).toContain("Value changed at /direction\\u202e");
    expect(text).toContain("Value changed at /next\\u0085");
    expect(text).not.toMatch(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
    expect(text.split("\n")).toHaveLength(8); // header + seven changes; no injected lines
    expect(report).toEqual(before);
    expect(report.changes.every((change) => !("values" in change))).toBe(true);
  });

  it("keeps escaped display paths distinct from literal backslash sequences", () => {
    const report = comparePayloads(
      { "line\nbreak": 1, "line\\nbreak": 1 },
      { "line\nbreak": 2, "line\\nbreak": 2 },
    );
    expect(report.changes).toHaveLength(2);
    const text = formatComparisonReport(report);
    expect(text).toContain("at /line\\nbreak");
    expect(text).toContain("at /line\\\\nbreak");
    expect(text.split("\n")).toHaveLength(3);
  });
});
