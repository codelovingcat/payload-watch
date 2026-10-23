# JSON Pointer Path Rules

**Status:** Implemented and covered by focused tests  
**Tracking issue:** [#12 — Encode JSON paths safely for unusual property names](https://github.com/codelovingcat/payload-watch/issues/12)

PayloadWatch uses JSON Pointer (RFC 6901) for the `path` field in every change record. It does not build dotted paths, and it does not interpret punctuation inside object keys as path syntax.

## Construction rules

- The root value uses the empty pointer, `""`.
- Each property name or array index adds one segment prefixed by `/`.
- Within a segment, escape `~` as `~0` and then escape `/` as `~1`. The order matters.
- Dots, spaces, brackets, quotation marks, and backslashes are ordinary characters in JSON Pointer segments and remain unchanged.
- Array positions use decimal indexes such as `/items/0/id`. PayloadWatch compares arrays by index and does not infer moves.
- The path builder lives in the internal helper `src/json-pointer.ts`; callers receive its result through the `path` on each reported change. The helper is not exported from the package's public entry point.

## Examples

| Location in the JSON value | JSON Pointer |
| --- | --- |
| Root value | `""` |
| Property `customer`, then property `name` | `/customer/name` |
| Literal property key `a.b` | `/a.b` |
| Nested property `b` inside `a` | `/a/b` |
| Literal property key `display name` | `/display name` |
| Literal property key `items[0]` | `/items[0]` |
| Literal property key `say"hello` | `/say"hello` |
| Literal property key `0` on an object | `/0` |
| Item at index zero in an array | `/0` |
| Literal property key `a/b` | `/a~1b` |
| Literal property key `a~b` | `/a~0b` |
| Literal property key `a/~b` | `/a~1~0b` |
| Empty-string property key | `/` |
| Property `id` in the first array element under `items` | `/items/0/id` |

A numeric-looking segment such as `0` is interpreted against the JSON document being traversed: it is a property name when its parent is an object and an array index when its parent is an array. That is how JSON Pointer defines segment resolution; the same textual segment remains unambiguous in the context of the payload.

## Why not dotted paths?

A string such as `customer.name` could mean a nested `customer` object with a `name` field, or a single property whose literal key is `customer.name`. JSON Pointer distinguishes those cases as `/customer/name` and `/customer.name`.

Punctuation is not stripped, replaced, or treated as a delimiter except for the two RFC 6901 escape sequences. This also preserves spaces, brackets, quotes, empty keys, and numeric-looking keys without a custom grammar.

## Tests

The path construction rules are covered by `tests/json-pointer.test.ts`. The broader regression matrix also includes path cases in `tests/regression.test.ts`. Run all tests with:

```bash
npm test
```

These tests document the expected behavior; runtime execution still needs to be verified in the repository environment before merge.
