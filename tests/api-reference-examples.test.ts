import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "../src/index.js";
import type { JsonValue, PayloadChange } from "../src/index.js";

describe("documented public API examples", () => {
  it("reports one primitive change and the documented formatted summary", () => {
    const report = comparePayloads({ status: "ready" }, { status: "processing" });
    expect(report.changes).toEqual([
      { kind: "value-changed", path: "/status", previousType: "string", currentType: "string" },
    ]);
    expect(formatComparisonReport(report)).toBe(
      "1 change detected:\n1. Value changed at /status (type: string)",
    );
  });

  it("reports the seven documented order-drift paths", async () => {
    const load = async (name: string): Promise<JsonValue> =>
      JSON.parse(await readFile(new URL(`../examples/order-payloads/${name}`, import.meta.url), "utf8")) as JsonValue;

    const report = comparePayloads(await load("baseline.json"), await load("current.json"));
    const paths: readonly string[] = report.changes.map((change: PayloadChange) => change.path);
    expect(paths).toEqual([
      "/customer/fullName",
      "/customer/name",
      "/items/0/quantity",
      "/items/2",
      "/orderId",
      "/shipping/address/city",
      "/shipping/method",
    ]);
    expect(formatComparisonReport(report)).toContain("7 changes detected:");
  });

  it("hides opt-in values in the formatter unless it also opts in", () => {
    const report = comparePayloads(
      { token: "baseline-private-value" },
      { token: "current-private-value" },
      { includeValues: true },
    );
    expect(formatComparisonReport(report)).not.toContain("private-value");
    expect(formatComparisonReport(report, { includeValues: true })).toContain("baseline-private-value");
  });

  it("escapes nested JSON Pointer keys and reports invalid value paths", () => {
    const pointerReport = comparePayloads({ "a/b": { "~": 1 } }, { "a/b": { "~": 2 } });
    expect(pointerReport.changes[0]?.path).toBe("/a~1b/~0");

    expect(() => comparePayloads({ amount: Number.NaN }, { amount: 1 })).toThrow(InvalidJsonInputError);
    try {
      comparePayloads({ amount: Number.NaN }, { amount: 1 });
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidJsonInputError);
      if (!(error instanceof InvalidJsonInputError)) throw error;
      expect(error.input).toBe("previousPayload");
      expect(error.path).toBe("/amount");
      expect(error.reason).toContain("finite");
    }
  });
});
