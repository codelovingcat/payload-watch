# Performance Benchmark

This benchmark establishes a repeatable local measurement process for `comparePayloads`. It deliberately does not set wall-clock pass/fail thresholds: timings depend on Node.js, hardware, operating-system load, and garbage collection.

## Run it

Use the repository's supported Node.js version and install the locked dependencies, then build the library and run the benchmark:

```bash
npm ci
npm run build
npm run benchmark
```

The command writes one JSON document to standard output. To save only the benchmark JSON after building:

```bash
node scripts/benchmark.mjs > benchmark-results.json
```

The file can be kept with the machine-specific results, but do not commit results as universal performance claims.

## Scenarios and defaults

The harness creates synthetic order records with no network or file I/O. By default it tests payloads containing 100, 1,000, and 10,000 records across three comparison patterns:

- **Unchanged:** separately allocated but structurally equivalent payloads.
- **Small diff:** a single changed status near the end of the order array.
- **Many diffs:** a changed quantity in every order record.

It also measures unchanged and leaf-changed payloads with 250 nested `child` objects. Every warm-up and measured run checks the expected change count, so unexpected output fails the benchmark rather than producing a misleading timing row.

The JSON output records the Node.js and V8 versions, OS/platform, architecture, CPU model and logical CPU count, total system memory, configured sizes, warm-up count, measured iteration count, estimated serialized input-pair bytes, and per-scenario timings. Timing values include the median and observed minimum/maximum. Heap-used and RSS deltas are process-wide snapshots; they are noisy, can be negative, and are not isolated allocation totals.

## Repeat or adjust a run

Defaults are 7 measured iterations and 2 warm-up runs. The following environment variables can adjust a local run:

- `PAYLOAD_BENCH_SIZES`: comma-separated order counts, from 1 to 50,000 (default: `100,1000,10000`).
- `PAYLOAD_BENCH_ITERATIONS`: measured iterations from 1 to 100 (default: `7`).
- `PAYLOAD_BENCH_WARMUP`: warm-up runs from 0 to 100 (default: `2`).

PowerShell example:

```powershell
$env:PAYLOAD_BENCH_SIZES = "1000,10000"
$env:PAYLOAD_BENCH_ITERATIONS = "15"
$env:PAYLOAD_BENCH_WARMUP = "3"
npm run benchmark
```

Bash example:

```bash
PAYLOAD_BENCH_SIZES=1000,10000 PAYLOAD_BENCH_ITERATIONS=15 PAYLOAD_BENCH_WARMUP=3 npm run benchmark
```

Run comparisons on the same machine with the same Node.js version and settings when looking for trends. Close unrelated CPU- or memory-heavy work where practical, repeat runs, and compare medians instead of inferring a conclusion from a single slow sample.

## Correctness coverage and current boundary

`tests/large-payload.test.ts` checks an unchanged 1,000-record comparison, a single change at the end of a large array, 1,000 reported changes, and a leaf change at depth 150. Run these tests with `npm test`. They contain no timing assertions.

These fixtures validate behavior at the tested sizes and depth only. PayloadWatch does not yet promise a maximum supported payload size or nesting depth. Define such a boundary only after collecting measurements on representative environments and deciding what guarantees the project intends to make. No baseline measurements or optimization claims are included in this document because the benchmark has not been run as part of preparing this change.
