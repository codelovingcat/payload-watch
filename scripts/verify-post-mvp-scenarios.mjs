import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { comparePayloads, formatComparisonReport } from "../dist/index.js";

// Reproduce scenarios using fictional payloads; never reads real provider data.
const previousFile = new URL("../examples/order-payloads/baseline.json", import.meta.url);
const currentFile = new URL("../examples/order-payloads/current.json", import.meta.url);
const previous = JSON.parse(readFileSync(previousFile, "utf8"));
const current = JSON.parse(readFileSync(currentFile, "utf8"));

const report = comparePayloads(previous, current);
const orderPaths = [
  "/customer/fullName", "/customer/name", "/items/0/quantity",
  "/items/2", "/orderId", "/shipping/address/city", "/shipping/method",
];
assert.deepEqual(report.changes.map((x) => x.path), orderPaths);
assert.equal(report.changes.length, 7);
assert.ok(report.changes.every((x) => !Object.hasOwn(x, "values")));
assert.match(formatComparisonReport(report), /^7 changes detected:/);

const baselineItems = { items: [{ sku: "A" }, { sku: "B" }] };
const withInsertedItem = { items: [{ sku: "X" }, { sku: "A" }, { sku: "B" }] };
const insertion = comparePayloads(baselineItems, withInsertedItem);
assert.deepEqual(insertion.changes.map((x) => x.path), [
  "/items/0/sku", "/items/1/sku", "/items/2",
]);

const beforeVolatile = { requestId: "request-1", status: "ready", identity: "fixed" };
const afterVolatile = { requestId: "request-2", status: "failed", identity: "fixed" };
const unfiltered = comparePayloads(beforeVolatile, afterVolatile);
const filtered = comparePayloads(beforeVolatile, afterVolatile, { ignorePaths: ["/requestId"] });
assert.deepEqual(unfiltered.changes.map((x) => x.path), ["/requestId", "/status"]);
assert.deepEqual(filtered.changes.map((x) => x.path), ["/status"]);
assert.equal(comparePayloads(previous, previous).changes.length, 0);

const result = spawnSync(process.execPath, [
  fileURLToPath(new URL("../bin/payload-watch.mjs", import.meta.url)),
  "compare", "--format", "json", "--fail-on-change",
  fileURLToPath(previousFile), fileURLToPath(currentFile),
], { encoding: "utf8" });
if (result.error) throw result.error;
assert.equal(result.status, 1, result.stderr);
assert.equal(result.stderr, "");
const cli = JSON.parse(result.stdout);
assert.deepEqual(cli.changes.map((x) => x.path), orderPaths);
assert.ok(cli.changes.every((x) => !Object.hasOwn(x, "values")));

console.log(JSON.stringify({
  check: "post-mvp-engineering-replay",
  orderChanges: report.changes.length,
  positionalArrayInsertionChanges: insertion.changes.length,
  noisyFieldChangesBeforeIgnore: unfiltered.changes.length,
  noisyFieldChangesAfterIgnore: filtered.changes.length,
  cliExitOnObservedChanges: result.status,
  valueSnapshotsExposed: false,
  userResearch: "not collected",
}, null, 2));
