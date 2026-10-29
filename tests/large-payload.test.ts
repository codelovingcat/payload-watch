import { describe, expect, it } from "vitest";
import { comparePayloads } from "../src/index.js";
import type { JsonValue } from "../src/index.js";

const LARGE_ORDER_COUNT = 1_000;

function makeOrderPayload(count: number) {
  return {
    orders: Array.from({ length: count }, (_, index) => ({
      id: `order-${index}`,
      quantity: index + 1,
      status: "pending",
    })),
  };
}

function makeDeepPayload(depth: number, leafValue: string): Record<string, JsonValue> {
  const root: Record<string, JsonValue> = {};
  let cursor = root;

  for (let index = 0; index < depth; index += 1) {
    const child: Record<string, JsonValue> = {};
    cursor.child = child;
    cursor = child;
  }

  cursor.value = leafValue;
  return root;
}

describe("large and deeply nested valid payloads", () => {
  it("returns no changes for 1,000 structurally equal records", () => {
    const previous = makeOrderPayload(LARGE_ORDER_COUNT);
    const current = structuredClone(previous);

    expect(comparePayloads(previous, current)).toEqual({ changes: [] });
  });

  it("finds one change near the end of a large array without reporting unchanged rows", () => {
    const previous = makeOrderPayload(LARGE_ORDER_COUNT);
    const current = structuredClone(previous);
    current.orders[LARGE_ORDER_COUNT - 1]!.status = "processed";

    expect(comparePayloads(previous, current).changes).toEqual([
      {
        kind: "value-changed",
        path: `/orders/${LARGE_ORDER_COUNT - 1}/status`,
        previousType: "string",
        currentType: "string",
      },
    ]);
  });

  it("returns every changed path for a dense 1,000-item diff", () => {
    const previous = makeOrderPayload(LARGE_ORDER_COUNT);
    const current = structuredClone(previous);
    for (const order of current.orders) {
      order.quantity += 1;
    }

    const report = comparePayloads(previous, current);

    expect(report.changes).toHaveLength(LARGE_ORDER_COUNT);
    expect(report.changes.map((change) => change.path)).toEqual(
      Array.from({ length: LARGE_ORDER_COUNT }, (_, index) => `/orders/${index}/quantity`),
    );
    expect(report.changes.every((change) => change.kind === "value-changed")).toBe(true);
  });

  it("finds a leaf change at a depth of 150 nested objects", () => {
    const depth = 150;
    const previous = makeDeepPayload(depth, "before");
    const current = makeDeepPayload(depth, "after");

    expect(comparePayloads(previous, current).changes).toEqual([
      {
        kind: "value-changed",
        path: `${"/child".repeat(depth)}/value`,
        previousType: "string",
        currentType: "string",
      },
    ]);
  });
});
