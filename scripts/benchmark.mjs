import os from "node:os";
import { performance } from "node:perf_hooks";
import { comparePayloads } from "../dist/index.js";

const DEFAULT_SIZES = [100, 1_000, 10_000];
const DEFAULT_ITERATIONS = 7;
const DEFAULT_WARMUP_RUNS = 2;
const MAX_ORDER_COUNT = 50_000;
const DEEP_NESTING_DEPTH = 250;
const MEBIBYTE = 1024 * 1024;

function readInteger(name, fallback, minimum, maximum = Number.MAX_SAFE_INTEGER) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}; received ${JSON.stringify(raw)}.`,
    );
  }
  return value;
}

function readSizes() {
  const raw = process.env.PAYLOAD_BENCH_SIZES;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_SIZES;
  }

  const sizes = raw.split(",").map((item) => {
    const value = Number(item.trim());
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_ORDER_COUNT) {
      throw new Error(
        `PAYLOAD_BENCH_SIZES must contain comma-separated integers from 1 to ${MAX_ORDER_COUNT}; received ${JSON.stringify(raw)}.`,
      );
    }
    return value;
  });

  if (sizes.length === 0) {
    throw new Error("PAYLOAD_BENCH_SIZES must include at least one size.");
  }
  return [...new Set(sizes)].sort((left, right) => left - right);
}

function makeOrderPayload(count) {
  return {
    orders: Array.from({ length: count }, (_, index) => ({
      id: `order-${String(index).padStart(5, "0")}`,
      status: "pending",
      quantity: index + 1,
      customer: {
        id: `customer-${index}`,
        active: index % 2 === 0,
      },
      tags: ["synthetic", "benchmark"],
    })),
  };
}

function makeDeepPayload(depth, leafValue) {
  const root = {};
  let cursor = root;

  for (let index = 0; index < depth; index += 1) {
    const child = {};
    cursor.child = child;
    cursor = child;
  }

  cursor.value = leafValue;
  return root;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function assertChangeCount(report, expected, label) {
  if (report.changes.length !== expected) {
    throw new Error(
      `${label}: expected ${expected} changes but received ${report.changes.length}.`,
    );
  }
}

function measureCase({ name, previous, current, expectedChanges, details, iterations, warmupRuns }) {
  const expectedLabel = name;

  for (let run = 0; run < warmupRuns; run += 1) {
    assertChangeCount(comparePayloads(previous, current), expectedChanges, expectedLabel);
  }

  const heapBefore = process.memoryUsage();
  const elapsedMs = [];

  for (let run = 0; run < iterations; run += 1) {
    const startedAt = performance.now();
    const report = comparePayloads(previous, current);
    const elapsed = performance.now() - startedAt;
    assertChangeCount(report, expectedChanges, expectedLabel);
    elapsedMs.push(elapsed);
  }

  const heapAfter = process.memoryUsage();
  const sorted = [...elapsedMs].sort((left, right) => left - right);

  return {
    name,
    ...details,
    expectedChanges,
    iterations,
    medianMs: Number(median(elapsedMs).toFixed(3)),
    minMs: Number(sorted[0].toFixed(3)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(3)),
    heapUsedDeltaMiB: Number(((heapAfter.heapUsed - heapBefore.heapUsed) / MEBIBYTE).toFixed(3)),
    rssDeltaMiB: Number(((heapAfter.rss - heapBefore.rss) / MEBIBYTE).toFixed(3)),
  };
}

const sizes = readSizes();
const iterations = readInteger("PAYLOAD_BENCH_ITERATIONS", DEFAULT_ITERATIONS, 1, 100);
const warmupRuns = readInteger("PAYLOAD_BENCH_WARMUP", DEFAULT_WARMUP_RUNS, 0, 100);

const measurements = [];

for (const size of sizes) {
  const previous = makeOrderPayload(size);

  const unchanged = structuredClone(previous);
  measurements.push(
    measureCase({
      name: "orders-unchanged",
      previous,
      current: unchanged,
      expectedChanges: 0,
      details: {
        orderCount: size,
        depth: null,
        inputPairBytes: jsonBytes(previous) + jsonBytes(unchanged),
      },
      iterations,
      warmupRuns,
    }),
  );

  const oneChange = structuredClone(previous);
  oneChange.orders[size - 1].status = "processed";
  measurements.push(
    measureCase({
      name: "orders-small-diff",
      previous,
      current: oneChange,
      expectedChanges: 1,
      details: {
        orderCount: size,
        depth: null,
        inputPairBytes: jsonBytes(previous) + jsonBytes(oneChange),
      },
      iterations,
      warmupRuns,
    }),
  );

  const manyChanges = structuredClone(previous);
  for (const order of manyChanges.orders) {
    order.quantity += 1;
  }
  measurements.push(
    measureCase({
      name: "orders-many-diffs",
      previous,
      current: manyChanges,
      expectedChanges: size,
      details: {
        orderCount: size,
        depth: null,
        inputPairBytes: jsonBytes(previous) + jsonBytes(manyChanges),
      },
      iterations,
      warmupRuns,
    }),
  );
}

const deepPrevious = makeDeepPayload(DEEP_NESTING_DEPTH, "baseline");
const deepUnchanged = makeDeepPayload(DEEP_NESTING_DEPTH, "baseline");
measurements.push(
  measureCase({
    name: "deep-unchanged",
    previous: deepPrevious,
    current: deepUnchanged,
    expectedChanges: 0,
    details: {
      orderCount: null,
      depth: DEEP_NESTING_DEPTH,
      inputPairBytes: jsonBytes(deepPrevious) + jsonBytes(deepUnchanged),
    },
    iterations,
    warmupRuns,
  }),
);

const deepChanged = makeDeepPayload(DEEP_NESTING_DEPTH, "current");
measurements.push(
  measureCase({
    name: "deep-leaf-diff",
    previous: deepPrevious,
    current: deepChanged,
    expectedChanges: 1,
    details: {
      orderCount: null,
      depth: DEEP_NESTING_DEPTH,
      inputPairBytes: jsonBytes(deepPrevious) + jsonBytes(deepChanged),
    },
    iterations,
    warmupRuns,
  }),
);

const cpuList = os.cpus();
const output = {
  benchmark: "PayloadWatch comparePayloads synthetic benchmark",
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    osRelease: os.release(),
    architecture: process.arch,
    cpuModel: cpuList[0]?.model ?? "unknown",
    logicalCpuCount: cpuList.length,
    totalMemoryMiB: Number((os.totalmem() / MEBIBYTE).toFixed(1)),
    nodeExecArgv: process.execArgv,
  },
  parameters: {
    orderCounts: sizes,
    deepNestingDepth: DEEP_NESTING_DEPTH,
    warmupRuns,
    measuredIterations: iterations,
    maxConfiguredOrderCount: MAX_ORDER_COUNT,
  },
  notes: [
    "Input-pair bytes are estimated from UTF-8 JSON serialization; they are not an object-memory estimate.",
    "Heap and RSS deltas are process-wide observations and are sensitive to garbage collection; they are not allocation totals.",
    "Each run checks the expected change count so the benchmark also guards basic output correctness.",
    "Timing results are descriptive measurements, not performance guarantees or test thresholds.",
  ],
  measurements,
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
