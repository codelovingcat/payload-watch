# PayloadWatch Array Comparison Policy

**Status:** Implemented in the core comparison engine  
**Tracking issue:** [#6 — Define and implement deterministic array comparison](https://github.com/codelovingcat/payload-watch/issues/6)

## Rule: arrays are ordered sequences

PayloadWatch compares arrays **by index**. It treats the positions as meaningful and never guesses that two similar objects represent a move, insertion, deletion, or replacement.

For each index, in ascending numeric order:

- If both arrays contain the index, compare those values with the same recursive rules used elsewhere.
- If only the current array contains the index, report an `added` change at that index.
- If only the previous array contains the index, report a `removed` change at that index.
- If values at a shared index have different JSON types, report one `type-changed` change at that index.
- Nested arrays and objects are recursively compared; their paths include the array index.

An array compared with a non-array value is reported as a `type-changed` record at the array's parent path, rather than producing child-level changes.

## Examples

### Changed item

Previous: `["ready", "old"]`  
Current: `["ready", "new"]`

The report contains one `value-changed` record at `/1`.

### Different lengths

Previous: `[10]`  
Current: `[10, 20]`

The report contains an `added` record at `/1` with `currentType: "number"`.

### Insertion at the start is not inferred

Previous: `[10, 20]`  
Current: `[5, 10, 20]`

PayloadWatch reports an observable `value-changed` at `/0`, another at `/1`, and an `added` record at `/2`. It does not infer that `5` was inserted and the other values moved.

This is intentional: index comparison is simple, reproducible, and avoids unreliable identity heuristics. It can report multiple changes after an insertion or reorder; users should interpret those as positional differences.

### Objects inside arrays

Given `[{ "id": 1, "name": "Ada" }]` and `[{ "id": 1, "name": "Grace" }]`, the changed name is reported at `/0/name`.

## Values and ordering

As with every other change, before/after values are omitted by default. Pass `{ includeValues: true }` to include changed values in the report.

Array indexes are visited numerically from lowest to highest. Changes nested under one index are emitted in depth-first order using the same deterministic object-key sorting and JSON Pointer path escaping used for objects.

No array items are moved, aligned, or matched by ID. More advanced matching can be considered later only if a concrete use case justifies the added complexity.
