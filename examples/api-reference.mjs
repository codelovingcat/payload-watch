import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  comparePayloads,
  formatComparisonReport,
  InvalidJsonInputError,
} from "../dist/index.js";

const minimal = comparePayloads(
  { status: "ready" },
  { status: "processing" },
);
assert.deepEqual(minimal.changes, [
  {
    kind: "value-changed",
    path: "/status",
    previousType: "string",
    currentType: "string",
  },
]);
assert.equal(
  formatComparisonReport(minimal),
  "1 change detected:\n1. Value changed at /status (type: string)",
);
console.log("Minimal example: 1 value change at /status");

const baseline = JSON.parse(readFileSync(new URL("./order-payloads/baseline.json", import.meta.url), "utf8"));
const current = JSON.parse(readFileSync(new URL("./order-payloads/current.json", import.meta.url), "utf8"));
const orderReport = comparePayloads(baseline, current);
const paths = [
  "/customer/fullName",
  "/customer/name",
  "/items/0/quantity",
  "/items/2",
  "/orderId",
  "/shipping/address/city",
  "/shipping/method",
];
assert.deepEqual(orderReport.changes.map((change) => change.path), paths);
console.log("Order API drift example: 7 changes");
console.log(formatComparisonReport(orderReport));

const privateReport = comparePayloads(
  { token: "baseline-private-value" },
  { token: "current-private-value" },
  { includeValues: true },
);
assert.ok(!formatComparisonReport(privateReport).includes("private-value"));
assert.match(
  formatComparisonReport(privateReport, { includeValues: true }),
  /baseline-private-value/,
);

const pointerReport = comparePayloads(
  { "a/b": { "~": 1 } },
  { "a/b": { "~": 2 } },
);
assert.equal(pointerReport.changes[0]?.path, "/a~1b/~0");

let invalid;
try {
  comparePayloads({ amount: Number.NaN }, { amount: 1 });
} catch (error) {
  invalid = error;
}
assert.ok(invalid instanceof InvalidJsonInputError);
assert.equal(invalid.input, "previousPayload");
assert.equal(invalid.path, "/amount");
assert.match(invalid.reason, /finite/);
console.log("Privacy, JSON Pointer and input validation examples: passed");
