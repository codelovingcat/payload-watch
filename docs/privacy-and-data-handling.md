# PayloadWatch Privacy and Data Handling

**Status:** Implemented defaults and explicit value-exposure controls  
**Tracking issue:** [#19 — Define safe handling of payload values in reports and errors](https://github.com/codelovingcat/payload-watch/issues/19)

PayloadWatch compares JSON values supplied by the caller. The library does not make HTTP requests, automatically log payloads, transmit comparison data, or write payload content to disk.

## Default behavior

By default, `comparePayloads` returns change kinds, JSON Pointer paths, and type metadata without before/after values. `formatComparisonReport` also omits before/after values by default—even when the structured report already contains them.

Invalid inputs throw `InvalidJsonInputError`, a `TypeError` subclass. Its message identifies which argument failed, the JSON Pointer path, and a concise reason. It does not serialize the invalid value or the full payload. Runtime validation inspects property descriptors so a rejected getter is not executed.

## Explicit value exposure

Before/after values are available only when the caller sets `includeValues: true` on `comparePayloads`:

```ts
const report = comparePayloads(previous, current, { includeValues: true });
```

This makes the changed value snapshots part of the returned structured report, which may contain personal data, credentials, or commercially sensitive information. For an added or removed object/array, the snapshot may contain the whole nested value at that location. A type change may similarly include the previous and current subtrees at the changed node.

The object and array values placed in the report are detached snapshots: mutating them does not mutate the original payload. That isolation is a correctness safeguard, not a redaction or confidentiality feature.

The text formatter has a separate opt-in:

```ts
const summary = formatComparisonReport(report); // values stay hidden
const detailedSummary = formatComparisonReport(report, { includeValues: true });
```

Values appear in text output only when the comparison report contains them and the formatter is separately configured to include them.

## Practical handling guidance

- Keep the default value-free report for normal logs, metrics, and error summaries.
- Enable value inclusion only for a specific diagnostic need and only when the destination is authorized to receive those values.
- Treat the structured report as sensitive whenever it was created with `includeValues: true`, even if you later pass it to the formatter without opting in.
- Remember that JSON Pointer paths contain property names. Avoid sending paths to logs or telemetry when the field names themselves reveal confidential information.
- If your workflow requires redaction, create a redacted copy before storing or sharing a detailed report. PayloadWatch does not add a general-purpose redaction hook in this release; explicit opt-in and caller-controlled handling keep the core API small and predictable.

These safeguards reduce accidental exposure; they do not replace the caller's own data classification, access controls, retention rules, or review of logging destinations.
