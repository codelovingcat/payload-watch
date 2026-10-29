# PayloadWatch — Public API Reference

**Tracking issue:** [#24 — API reference and troubleshooting](https://github.com/codelovingcat/payload-watch/issues/24)

This reference describes the **currently implemented** ESM-only API from `src/index.ts`. The project is not yet published on npm (`private: true`); use a source checkout or a locally installed package archive for now. No HTTP requests, snapshot captures, CLI commands, persistence, or automatic API integrations are provided by the library.

## Setup

With Node.js 22.12+ and npm, in the repository checkout:

```bash
npm ci
npm run build
node examples/api-reference.mjs
```

The runnable sample imports `../dist/index.js` because it lives in `examples/`. In an application that has installed a built package archive, import from `"payload-watch"` instead:

```ts
import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "payload-watch";
import type { JsonValue, ComparisonReport } from "payload-watch";
```

The public package entry point is ESM, with generated declarations at `dist/index.d.ts`. Only the package root is exported: do not depend on private `dist/` subpaths. See [Package Entry Points](package-entrypoints.md).

## 1. Runtime functions

### `comparePayloads(previousPayload, currentPayload, options?)`

```ts
function comparePayloads(
  previousPayload: JsonValue,
  currentPayload: JsonValue,
  options?: CompareOptions,
): ComparisonReport;
```

- **`previousPayload`** is the baseline (earlier/known-good JSON value).
- **`currentPayload`** is the newly observed value. Input order matters for `added` versus `removed`.
- **`options.includeValues`** (optional; default `false`) attaches detached before/after values to change records. Values can contain credentials or personal information, and an added or removed container may include an entire subtree.
- **Return:** synchronous `{ changes: PayloadChange[] }` with changes in deterministic traversal order. An identical pair returns `{ changes: [] }`. No mutation of the input payloads is intended.
- **Errors:** both inputs are validated against the JSON runtime contract before comparison. Invalid values throw `InvalidJsonInputError`.

A root input may be `null`, a finite number, boolean, string, array, or plain JSON object. Pass parsed JSON **values**, not serialized JSON text, if you intend a structural comparison.

Minimal example (one primitive value change):

```js
import { comparePayloads, formatComparisonReport } from "payload-watch";

const report = comparePayloads(
  { status: "ready" },
  { status: "processing" },
);
console.log(report.changes);
// [{ kind: "value-changed", path: "/status", previousType: "string", currentType: "string" }]
console.log(formatComparisonReport(report));
// 1 change detected:
// 1. Value changed at /status (type: string)
```

### `formatComparisonReport(report, options?)`

```ts
function formatComparisonReport(
  report: ComparisonReport,
  options?: FormatOptions,
): string;
```

Converts a structured report into a deterministic, human-readable multiline string. It does not log, persist, transmit or modify the report.

- **`report`** is the result returned by `comparePayloads`.
- **`options.includeValues`** (optional; default `false`) allows the formatter to display values **only when they were already included in the report**.
- **Return:** `"No changes detected."` for zero changes, otherwise a count and one numbered line per change. An empty JSON Pointer (root) is rendered as `<root>` in text.

Both flags are required to display actual values:

```js
const before = { profile: { token: "old-secret" } };
const after = { profile: { token: "new-secret" } };
const report = comparePayloads(before, after, { includeValues: true });

// Hides before/after values even though the structured report includes them.
formatComparisonReport(report);

// Deliberate second opt-in: includes the changed values in returned text.
formatComparisonReport(report, { includeValues: true });
```

**Privacy:** even when the text output hides values, the `report` above **already contains** `old-secret` and `new-secret`. Avoid logging or distributing such reports without an appropriate redaction and access policy. A formatter-only opt-in cannot retrieve values absent from the report. JSON Pointer paths themselves may contain sensitive *property names*. See [Privacy and Data Handling](privacy-and-data-handling.md).

### `InvalidJsonInputError`

`InvalidJsonInputError extends TypeError` is exported as a runtime class. Its readable fields are:

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | `"InvalidJsonInputError"`. |
| `message` | `string` | Input name, JSON Pointer and a short rejection reason, without serializing the payload values. |
| `input` | `"previousPayload" &#124; "currentPayload"` | Which argument failed validation. |
| `path` | `string` | JSON Pointer to the invalid value; `""` means root. |
| `reason` | `string` | Why the input was rejected (for example, a non-finite number). |

```js
try {
  comparePayloads({ amount: Number.NaN }, { amount: 1 });
} catch (error) {
  if (!(error instanceof InvalidJsonInputError)) throw error;
  console.log(error.input);  // "previousPayload"
  console.log(error.path);   // "/amount"
  console.log(error.reason); // Explains that numbers must be finite
}
```

The validator rejects `undefined`, `bigint`, symbols, functions, `NaN`, infinities, cycles, sparse arrays, symbol/non-enumerable/accessor properties, non-plain objects such as `Date`, and arrays with custom prototypes or extra properties. It uses property descriptors to avoid executing getters. TypeScript types alone cannot ensure runtime data is valid. See [JSON Input Contract](json-input-contract.md).

## 2. Public type exports

These are **type-only exports** from `"payload-watch"`; they are not runtime JavaScript values.

| Type | Meaning |
| --- | --- |
| `JsonPrimitive` | `string &#124; number &#124; boolean &#124; null`; runtime numbers must be finite. |
| `JsonArray` | `readonly JsonValue[]`. |
| `JsonObject` | String-keyed, readonly `JsonValue` properties. |
| `JsonValue` | Recursive union of primitives, arrays and objects. |
| `JsonPointer` | `string`; `""` for the root or RFC 6901 syntax for descendants. |
| `JsonValueType` | `"object" &#124; "array" &#124; "string" &#124; "number" &#124; "boolean" &#124; "null"`. |
| `ChangeKind` | `"added" &#124; "removed" &#124; "value-changed" &#124; "type-changed"`. |
| `ChangeBase<TKind extends ChangeKind = ChangeKind>` | Readonly common `kind` and `path` fields. |
| `AddedChange` | `kind: "added"`, `currentType`, optional `values.current`. |
| `RemovedChange` | `kind: "removed"`, `previousType`, optional `values.previous`. |
| `ValueChangedChange` | `kind: "value-changed"`, `previousType`, `currentType`, optional primitive before/after values. |
| `TypeChangedChange` | `kind: "type-changed"`, `previousType`, `currentType`, optional before/after JSON values. |
| `PayloadChange` | Discriminated union of the four change record types. |
| `CompareOptions` | `readonly includeValues?: boolean` (default `false`). |
| `FormatOptions` | `readonly includeValues?: boolean` (default `false`). |
| `ComparisonReport` | `readonly changes: readonly PayloadChange[]`. |

The type-level `readonly` modifier describes the API contract, not deep runtime freezing. When `includeValues: true`, included arrays/objects are **detached copies** of the changed subtree; mutating a returned copy does not mutate the original payload.

## 3. Change kinds, ordering, arrays and paths

| Kind | When returned | Example |
| --- | --- | --- |
| `added` | A key or array element exists only in the current payload. | `{} → { "nickname": null }` at `/nickname`. |
| `removed` | A key or array element exists only in the baseline. | `{ "x": 1 } → {}` at `/x`. |
| `value-changed` | Different primitive values with the **same** JSON type. | `{ "n": 1 } → { "n": 2 }` at `/n`. |
| `type-changed` | The value's JSON type changed. The engine does not descend into that replaced subtree. | `{ "id": 1 } → { "id": "1" }` at `/id`. |

**Missing is different from `null`.** A key that is absent versus one explicitly holding `null` is reported as added or removed, not ignored. A transition between an object and an array is a single `type-changed` event at that node. No coercion is performed between numbers and strings.

**Array indices are positional.** Array comparison visits common indices in ascending order, followed by added/removed trailing elements. It does **not** detect moves, reorder items by `id`, or match entities semantically. Inserting at index 0 may produce multiple positional differences. Sparse arrays are invalid input.

**Paths are RFC 6901 JSON Pointers.** `""` is root; `/items/0/quantity` is a nested array property. The property key `a/b` becomes `a~1b`, and `~` becomes `~0`; the nested path for `{ "a/b": { "~": 2 } }` is `/a~1b/~0`. A property literally containing a dot is not the same as a nested object. Object keys are compared in ascending JavaScript string sort order and arrays in numeric index order.

For more: [Comparison Semantics](comparison-semantics.md), [Array Policy](array-comparison.md) and [JSON Pointer Rules](json-pointer-paths.md).

## 4. Realistic order API drift example

The repository includes entirely **fictional** snapshots at [`examples/order-payloads/`](../examples/order-payloads/). A previous order uses a numeric `orderId`, `customer.name`, standard delivery, and two items. The later snapshot changes the ID to a string, uses `customer.fullName`, changes shipping and quantities, and adds an item.

```js
import { readFileSync } from "node:fs";
import { comparePayloads, formatComparisonReport } from "payload-watch";

const previous = JSON.parse(readFileSync("examples/order-payloads/baseline.json", "utf8"));
const current = JSON.parse(readFileSync("examples/order-payloads/current.json", "utf8"));
const report = comparePayloads(previous, current);

console.log(report.changes.map((change) => change.path));
console.log(formatComparisonReport(report));
```

This reports **seven paths**, in order:

```text
/customer/fullName
/customer/name
/items/0/quantity
/items/2
/orderId
/shipping/address/city
/shipping/method
```

The renamed-looking customer field appears as **one added and one removed key**; the library cannot infer that a rename was intentional. The added item is reported as one added object at `/items/2`, not a list of every new field. This example uses local fixture files loaded by the *caller*: the library does not fetch the data. To execute a working version from the repository checkout, run `node examples/api-reference.mjs` after building.

## 5. Troubleshooting

| Symptom | Check / remedy |
| --- | --- |
| Import fails with `ERR_MODULE_NOT_FOUND` or a missing `dist/index.js`. | This repository is not yet on npm; build with `npm ci && npm run build`. Use `../dist/index.js` in the checked-in example, or install a locally packed artifact in an external project. ESM imports require a compatible Node.js runtime. |
| TypeScript cannot find the module or exported types. | Run the build to create `dist/index.d.ts`. Use the package root import and TypeScript NodeNext-compatible resolution; do not import private internal subpaths. Check [Package Entry Points](package-entrypoints.md). |
| `InvalidJsonInputError` from an input. | Inspect `error.input`, `error.path`, and `error.reason`, not the entire payload. Remove `undefined`, `NaN`, cycles, sparse arrays or JS-only objects; use plain JSON values. |
| The report shows a single root-level type change. | Root types differ (for example a string of JSON text versus an object). If the input is JSON text, use `JSON.parse` before comparing. `""` is the root pointer. |
| A missing field and a `null` field are reported as different. | This is deliberate: a missing property is not the same as a present `null` value. |
| An inserted array item causes many changes. | Comparison is by **index**, not by element identity; no move or reorder detection exists. |
| `/a~1b` or `/x~0y` looks odd. | These are escaped JSON Pointer keys: `~1` decodes to `/`, `~0` to `~`. |
| `includeValues: true` but no values appear in text. | Opt in on **both** `comparePayloads` and `formatComparisonReport`. The structured report may already contain sensitive values. |
| No changes are reported though business behavior changed. | This utility compares **observed JSON**, not API schemas, business rules or contract compatibility. Equal snapshots cannot reveal unobserved behavior changes. |
| Deep nesting consumes excessive memory or fails at runtime. | Comparison and validation are recursive. No guaranteed maximum depth or size has been established; see [Performance Benchmark](performance-benchmark.md). |

## 6. Current limitations

- **Observation, not impact analysis:** a `PayloadChange` is not automatically a breaking-change verdict.
- **No identity-aware array diffs:** no key matching, move detection or reorder interpretation.
- **No built-in ignore list, schema inference, HTTP fetching, CLI, watch mode, or durable snapshot storage** in the current library release scope.
- **No general automatic redaction:** use the default value-free report, or safely handle opt-in values and JSON Pointer paths.
- **Synchronous and recursive:** very large or unusually deep payloads have not been assigned a guaranteed limit or performance SLA.
- **Distribution not complete:** this is ESM-only, Node.js 22.12+, and **not yet published**. The repository has no selected software license yet; see [Licensing Decision](licensing-decision.md).

The executable examples and their expected output are checked in CI through `node examples/api-reference.mjs`, while Vitest covers the same comparison semantics independently of build output.
