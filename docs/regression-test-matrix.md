# PayloadWatch Regression Test Matrix

**Status:** Core JSON comparison regression coverage
**Tracking issue:** [#9 — Cover edge cases with a focused regression test suite](https://github.com/codelovingcat/payload-watch/issues/9)

## Run the tests

From the repository root, run the single documented command:

```bash
npm test
```

The test suite uses Vitest and in-memory values only. It does not call third-party APIs or require network access at test time.

## Coverage

| Area | Regression guarantees |
| --- | --- |
| Equal values | Empty objects, empty arrays, nested empty containers, and each JSON root value kind are covered. Dedicated rules also test primitive equality and property-order-independent object equality. |
| Primitive semantics | Strings are not coerced to numbers; booleans remain distinct from numbers. |
| Change kinds | Additions, removals, same-type value changes, and type changes have asserted output shapes. |
| Null and absence | Missing properties and explicit `null` are tested in both directions. |
| Nested structures | Nested objects, arrays, and object/array transitions retain precise paths. |
| Arrays | Length differences, changes at shared indexes, nested values, and stable index order are covered. |
| JSON Pointer | Dotted versus nested keys, spaces, numeric-looking keys, brackets, quotes, empty keys, slashes, and tildes are covered. |
| Determinism | Repeated comparisons must serialize to the same report. |
| Side effects and data exposure | Inputs remain unchanged; values remain omitted by default. |
| Explicit semantic rules | `tests/comparison-semantics.test.ts` verifies no coercion, missing versus `null`, object/array transitions, nested paths, and JSON text versus parsed values. |

## Invalid JavaScript inputs

Unsupported values such as `undefined`, non-finite numbers, sparse arrays, accessors, and circular references are part of the documented input-validation contract but are not asserted here until the runtime validator is implemented in [Issue #13](https://github.com/codelovingcat/payload-watch/issues/13). They must not be treated as supported inputs merely because the current TypeScript types can be bypassed at runtime.

## Scope

This suite focuses on stable, valid JSON behavior. Tests for readable report text remain with the report formatter feature; runtime invalid-input tests belong to Issue #13. The structured comparison tests do not parse terminal output or depend on external services.
