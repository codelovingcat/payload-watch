# PayloadWatch Comparison Semantics

**Status:** Implemented and covered by focused tests  
**Tracking issue:** [#11 — Specify equality, missing-field, and null semantics](https://github.com/codelovingcat/payload-watch/issues/11)

This document defines what PayloadWatch considers equal when comparing two valid JSON values. The rules are structural and deterministic; they do not try to infer business meaning.

## Equality rules

### JSON primitives

Primitive values are compared without implicit conversion:

- Strings are equal only when their string values match exactly.
- Numbers are compared as numbers. A number is not equal to a string containing the same digits: `42` and `"42"` produce a `type-changed` report.
- Booleans are distinct from numbers: `true` and `1` are different JSON types.
- `null` is equal to `null`, but not to an absent property, an object, or any other value.
- JSON does not have `undefined`, `NaN`, or infinities as values accepted by this contract. Runtime validation for unsupported JavaScript values is tracked separately in [Issue #13](https://github.com/codelovingcat/payload-watch/issues/13).

PayloadWatch compares values that the caller supplies. It does not parse a string as JSON automatically. For example, the string `"{\"id\":1}"` is a JSON string; it is not automatically treated as the object `{ id: 1 }`.

### Objects

Objects are compared structurally, not by reference identity or property insertion order:

- The same set of keys with recursively equal values is equal.
- A key present on only one side produces an `added` or `removed` change.
- Keys are visited in deterministic ascending string order.
- Empty objects `{}` and `{}` are equal.
- An object and an array are different JSON types even when their contents appear similar.

For example, `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are equal. Reordering object keys alone does not create a report.

### Arrays

Arrays are ordered sequences and are compared by numeric index. Two arrays are equal when they contain the same values at every index and have the same length. Empty arrays `[]` and `[]` are equal. Insertions and moves are not inferred; see [Array Comparison Policy](array-comparison.md).

### Missing properties versus explicit null

An absent property is not a JSON value. A property explicitly set to `null` is present and has JSON type `null`.

Comparing `{}` with `{ nickname: null }` reports an `added` change at `/nickname` with `currentType: "null"`. Reversing the inputs reports a `removed` change at `/nickname` with `previousType: "null"`. This rule also applies to nested properties and array values as defined by the array policy.

### Type changes stop at the changed node

If the JSON type at a location changes, PayloadWatch reports one `type-changed` record at that location. It does not continue into children of the replaced node.

For example, changing `{ payload: { id: 1 } }` to `{ payload: [{ id: 1 }] }` produces a type change at `/payload`, not a collection of child-level additions and removals. At the root, the JSON Pointer path is the empty string `""`.

## Examples and corresponding tests

| Rule | Example | Expected behavior | Test |
| --- | --- | --- | --- |
| Exact primitive equality | `"ready"` vs `"ready"` | No changes | `keeps equal JSON primitives equal` |
| No coercion | `42` vs `"42"` | Root `type-changed` | `does not coerce numbers, strings, or booleans` |
| Structural object equality | `{ a: 1, b: 2 }` vs `{ b: 2, a: 1 }` | No changes | `compares objects structurally regardless of property insertion order` |
| Empty containers | `{}` vs `{}`; `[]` vs `[]` | No changes | `treats matching empty objects and arrays as equal` |
| Missing and null | `{}` vs `{ nickname: null }` | `added` at `/nickname` | `distinguishes missing properties from explicit null in both directions` |
| Object vs array | `{ payload: {} }` vs `{ payload: [] }` | One `type-changed` at `/payload` | `reports object-array transitions once at the changed node` |
| Nested value | `{ customer: { active: true } }` vs `{ customer: { active: false } }` | `value-changed` at `/customer/active` | `reports a nested primitive change at its JSON Pointer path` |
| JSON text vs value | `"{\"id\":1}"` vs `{ id: 1 }` | Root `type-changed` | `does not parse JSON text implicitly` |

The executable examples are in `tests/comparison-semantics.test.ts`. Unsupported JavaScript inputs are intentionally excluded from this suite until the runtime validator is implemented.
