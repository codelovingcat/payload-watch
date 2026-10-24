import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { comparePayloads, formatComparisonReport } from "../src/index.js";
import type { JsonValue } from "../src/index.js";

async function loadPayload(filename: string): Promise<JsonValue> {
  const url = new URL(`../examples/order-payloads/${filename}`, import.meta.url);
  const text = await readFile(url, "utf8");
  return JSON.parse(text) as JsonValue;
}

describe("realistic order API drift examples", () => {
  it("reports expected changes for a synthetic order response update", async () => {
    const previous = await loadPayload("baseline.json");
    const current = await loadPayload("current.json");

    const report = comparePayloads(previous, current);

    expect(report.changes).toEqual([
      { kind: "added", path: "/customer/fullName", currentType: "string" },
      { kind: "removed", path: "/customer/name", previousType: "string" },
      {
        kind: "value-changed",
        path: "/items/0/quantity",
        previousType: "number",
        currentType: "number",
      },
      { kind: "added", path: "/items/2", currentType: "object" },
      {
        kind: "type-changed",
        path: "/orderId",
        previousType: "number",
        currentType: "string",
      },
      {
        kind: "value-changed",
        path: "/shipping/address/city",
        previousType: "string",
        currentType: "string",
      },
      {
        kind: "value-changed",
        path: "/shipping/method",
        previousType: "string",
        currentType: "string",
      },
    ]);

    expect(formatComparisonReport(report)).toBe(
      [
        "7 changes detected:",
        "1. Added value at /customer/fullName (current type: string)",
        "2. Removed value at /customer/name (previous type: string)",
        "3. Value changed at /items/0/quantity (type: number)",
        "4. Added value at /items/2 (current type: object)",
        "5. Type changed at /orderId (number → string)",
        "6. Value changed at /shipping/address/city (type: string)",
        "7. Value changed at /shipping/method (type: string)",
      ].join("\n"),
    );
  });

  it("returns no changes for an unchanged baseline/current pair", async () => {
    const previous = await loadPayload("baseline.json");
    const current = await loadPayload("unchanged.json");

    expect(comparePayloads(previous, current)).toEqual({ changes: [] });
    expect(formatComparisonReport(comparePayloads(previous, current))).toBe(
      "No changes detected.",
    );
  });

  it("produces the same serialized report for repeated fixture comparisons", async () => {
    const previous = await loadPayload("baseline.json");
    const current = await loadPayload("current.json");
    const first = JSON.stringify(comparePayloads(previous, current, { includeValues: true }));

    for (let run = 0; run < 5; run += 1) {
      expect(JSON.stringify(comparePayloads(previous, current, { includeValues: true })))
        .toBe(first);
    }
  });
});
