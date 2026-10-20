# PayloadWatch Change Model and Path Format

**Status:** Proposed design for review  
**Tracking issue:** [#4 — Design the change model and JSON path format](https://github.com/codelovingcat/payload-watch/issues/4)

This document defines the intended shape of a detected change. It specifies the result contract; it does not claim that the comparison engine is implemented.

## 1. Design goals

Every change record should be:

- **Structured:** easy for another program to consume as JSON.
- **Specific:** identify what kind of difference was observed and where.
- **Predictable:** use a finite set of change kinds and deterministic ordering.
- **Careful with data:** omit before/after values by default because API payloads can contain sensitive information.
- **Honest about impact:** describe observed changes, not assert that a change is definitely breaking for every consumer.

## 2. Change kinds

PayloadWatch uses a discriminated union with four change kinds:

| Kind | Meaning | Example |
| --- | --- | --- |
| `added` | A property or array element is present only in the current payload. | `/customer/email` appears |
| `removed` | A property or array element is present only in the previous payload. | `/customer/email` disappears |
| `value-changed` | A primitive's value changes but its JSON type remains the same. | `"ready" → "pending"` |
| `type-changed` | A value changes from one JSON type to another. | `number → string` |

The JSON types used in the report are `object`, `array`, `string`, `number`, `boolean`, and `null`. A missing property is not a JSON type and is represented by an `added` or `removed` change instead.

Objects and arrays with the same outer type are intended to be compared recursively. A primitive value change with a stable type is `value-changed`. If a node's JSON type changes, PayloadWatch reports one `type-changed` record at that node instead of also reporting every child that is no longer comparable.

A change kind is descriptive; it is not a severity or a guarantee of consumer impact.

## 3. Structured report shape

The comparison function is intended to return a `ComparisonReport`:

```ts
interface ComparisonReport {
  readonly changes: readonly PayloadChange[];
}
```

An empty `changes` array means that the inputs were equivalent under the documented comparison rules. A report with differences contains records from the `PayloadChange` union.

Each record has:

- `kind`: the change category;
- `path`: the affected value's JSON Pointer;
- `previousType` and/or `currentType`: the observed type information appropriate to that change kind;
- optional `values`: before/after data, present only when the caller explicitly opts in.

The exact function implementation and runtime behavior will follow in the comparison-engine issue. This document and `src/change-model.ts` define the intended data contract.

## 4. Why JSON Pointer?

PayloadWatch will use **JSON Pointer (RFC 6901)** rather than an informal dotted path such as `$.customer.name`.

Dotted paths become ambiguous if a property itself contains a dot. JSON Pointer provides a small escaping rule, is easy to serialize, and clearly represents array indexes.

Examples:

| Location | JSON Pointer |
| --- | --- |
| Root value | `""` (empty string) |
| `customer.name` | `/customer/name` |
| Item 0's `id` in `items` | `/items/0/id` |
| Property whose literal key is `a.b` | `/a.b` |
| Property whose literal key is `a/b` | `/a~1b` |
| Property whose literal key is `a~b` | `/a~0b` |
| Empty-string property name | `/` |
| Property key `hello world` | `/hello world` |

Within a property name, escape `~` as `~0` and escape `/` as `~1`, in that order. Dots and spaces are not special in JSON Pointer.

For example, these are different locations:

- `/a/b`: property `b` nested inside property `a`;
- `/a.b`: the single property whose key is the literal string `a.b`.

The empty string identifies the root value. A leading slash identifies a path segment. A path implementation must preserve this distinction and must not build paths by simply joining raw keys with slashes.

## 5. Before/after values and privacy

By default, a change record should include the path, kind, and type metadata—but not the old or new value.

The proposed option is:

```ts
comparePayloads(previousPayload, currentPayload, {
  includeValues: true,
});
```

When `includeValues` is enabled, the report can include the value or values associated with the changed location under `values`. For example, an added field includes `values.current`; a removed field includes `values.previous`; a change to an existing value includes both.

This is an opt-in behavior because external API responses may contain personal data, tokens, or business-sensitive values. PayloadWatch will not automatically log, upload, or transmit payload contents. A caller who enables value inclusion remains responsible for handling the resulting report safely.

The `ChangeValues` TypeScript type models the possible before/after shapes. The option and runtime behavior will be implemented with the public comparison function; this issue only establishes the proposed contract.

## 6. Deterministic ordering

The report should use deterministic depth-first traversal:

1. Compare the root values first when the root itself produces one change.
2. Visit object keys in ascending default JavaScript string sort order, not locale-aware order.
3. Visit array indexes in ascending numeric order.
4. Emit a change at a node whose JSON type changed without emitting descendant changes under that replaced node.
5. For arrays, follow the index-by-index comparison policy defined in [Issue #6](https://github.com/codelovingcat/payload-watch/issues/6).

This makes identical input pairs produce changes in a stable order across runs. The comparison-engine and array issues will turn these rules into tests.

## 7. TypeScript contract

The types in `src/change-model.ts` are exported from the package entry point:

- `ChangeKind`
- `JsonPointer`
- `JsonValueType`
- `ChangeBase`
- `AddedChange`
- `RemovedChange`
- `ValueChangedChange`
- `TypeChangedChange`
- `PayloadChange`
- `CompareOptions`
- `ComparisonReport`

The discriminated `kind` field enables consumers to narrow a change safely:

```ts
function describeChange(change: PayloadChange): string {
  switch (change.kind) {
    case "added":
      return `Added value at ${change.path} (${change.currentType})`;
    case "removed":
      return `Removed value at ${change.path} (${change.previousType})`;
    case "value-changed":
      return `Value changed at ${change.path}`;
    case "type-changed":
      return `Type changed at ${change.path}: ${change.previousType} -> ${change.currentType}`;
  }
}
```

This snippet demonstrates type narrowing against the proposed union; it does not call an implemented comparison function.

## 8. Decisions for review

- Use four change kinds: `added`, `removed`, `value-changed`, and `type-changed`.
- Use JSON Pointer paths, including RFC 6901 escaping.
- Keep a `ComparisonReport` wrapper containing the ordered `changes` array.
- Omit before/after values by default; expose them only when `includeValues: true` is explicitly requested.
- Sort object keys deterministically, walk arrays by numeric index, and report a replaced node's type change once.
- Keep impact/severity classification separate from observed change kinds.

## 9. Acceptance checklist

- [x] Structured change records cover additions, removals, value changes, and type changes.
- [x] Type metadata and paths are described.
- [x] Paths use a reversible standard format for dots, slashes, tildes, spaces, and empty keys.
- [x] Value exposure is opt-in and the default is documented.
- [x] Ordering is defined without locale-dependent sorting.
- [x] The model distinguishes observed changes from impact classification.
- [ ] Runtime diff behavior and report formatting are implemented and tested in later issues.

The remaining unchecked item is implementation work, not a missing design decision.