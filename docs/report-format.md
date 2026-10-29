# PayloadWatch Report Format

**Status:** Implemented  
**Tracking issue:** [#8 — Produce readable summaries and stable structured reports](https://github.com/codelovingcat/payload-watch/issues/8)

PayloadWatch provides a structured report for code and an optional text summary for people.

## Structured report

`comparePayloads(previousPayload, currentPayload, options?)` returns a `ComparisonReport`:

```ts
interface ComparisonReport {
  readonly changes: readonly PayloadChange[];
}
```

The `changes` array is the structured source of truth. Each record has a `kind`, JSON Pointer `path`, and type metadata. Order is deterministic: object keys are sorted, array indexes are visited numerically, and traversal is depth-first.

Consumers should inspect `report.changes` directly instead of parsing terminal text. The summary formatter does not replace or alter the structured data.

## Human-readable summary

Use `formatComparisonReport(report, options?)` to produce a concise deterministic string:

```ts
import { comparePayloads, formatComparisonReport } from "./dist/index.js";

const report = comparePayloads(
  { id: 12, status: "ready" },
  { id: "12", status: "pending" },
);

console.log(formatComparisonReport(report));
```

Output:

```text
2 changes detected:
1. Type changed at /id (number → string)
2. Value changed at /status (type: string)
```

An empty report has an explicit representation:

```text
No changes detected.
```

For a root-level change, the summary uses `<root>` for readability. The structured report keeps the JSON Pointer root path as the empty string (`""`).

## Value-exposure policy

The summary formatter does not print before/after values by default, even if the structured report already contains values. To print those values, both the comparison and formatting calls must opt in:

```ts
const report = comparePayloads(previous, current, { includeValues: true });
const summary = formatComparisonReport(report, { includeValues: true });
```

The second opt-in helps prevent accidental exposure of API fields containing personal, credential, or business-sensitive data. Note that `includeValues: true` on `comparePayloads` means the structured report itself contains the changed values even when the formatter omits them. Treat that report as sensitive. Added/removed container values and type-changed values can include whole nested objects or arrays at the affected location. The formatter returns a string; it does not call `console.log`, transmit data, or write files by itself. See [Privacy and Data Handling](privacy-and-data-handling.md).

When values are explicitly included, objects are rendered as compact JSON with keys sorted recursively. This keeps output stable for equivalent object values, even if their property insertion order differs. Large values can still produce large summaries, so enable this option only when the destination is suitable for the data. JSON Pointer paths include property names; keep that in mind when logging reports or errors if your schema uses confidential field names.

## Change wording

Each summary item includes the observed difference and its path:

- `Added value at /field (current type: string)`
- `Removed value at /field (previous type: number)`
- `Value changed at /field (type: string)`
- `Type changed at /field (number → string)`

These descriptions report structure only. They do not classify a change as breaking or non-breaking.

## Public API

- `ComparisonReport`: structured report wrapper returned by `comparePayloads`.
- `PayloadChange`: discriminated union of all change records.
- `FormatOptions`: formatting options; `includeValues` defaults to `false`.
- `formatComparisonReport`: stable, side-effect-free text formatter.

The formatter follows the existing report order and does not re-sort changes. The readable summary and structured result therefore refer to changes in the same sequence.
