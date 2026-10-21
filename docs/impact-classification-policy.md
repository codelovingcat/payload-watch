# PayloadWatch Impact Classification Policy

**Decision:** Defer impact classification from the v0.1 MVP  
**Tracking issue:** [#7 — Define the impact-classification policy](https://github.com/codelovingcat/payload-watch/issues/7)

## Decision

PayloadWatch v0.1 reports **observed structural differences only**. It does not classify a change as `breaking`, `non-breaking`, or `unknown`, and it does not assign severity or risk scores.

The existing change kinds remain descriptive:

- `added`: a property or array item exists only in the current payload.
- `removed`: a property or array item exists only in the previous payload.
- `value-changed`: a primitive value differs while its JSON type is unchanged.
- `type-changed`: the JSON type differs at a location.

These report kinds describe what the supplied values show. They are not impact labels.

## Why classification is deferred

A comparison of two payloads does not reveal the contract or behavior of every consumer. Impact can depend on whether a field is required, how strict validation is configured, which fields the application reads, whether null is allowed, and what downstream business logic expects.

A universal rule would therefore risk presenting guesses as facts. Keeping classification out of v0.1 lets the core diff remain predictable and useful without overstating what two samples can prove.

## Examples: observations are not guarantees

| Observed change | What PayloadWatch reports | Why it does not assign impact |
| --- | --- | --- |
| A property is removed | `removed` at the affected path | The consumer may require the property, or may never use it. |
| A number becomes a string | `type-changed` with `number` and `string` | The consumer may validate strictly, coerce values, or never use that field. |
| A property is added | `added` at the affected path | A strict consumer may reject unknown fields, while another ignores them. |
| A value changes but keeps its type | `value-changed` | The new value may be valid or invalid depending on domain rules. |
| An array's indexed values change | Changes at the observed indexes | Index-based comparison does not know whether a consumer treats the array as an ordered list or associates items by an external identity. |

These examples explain why PayloadWatch reports structural facts without silently converting them into consumer-specific conclusions.

## Future extension requirements

Impact classification may be reconsidered after the core comparison, validation, and reporting behavior is stable. Any later implementation must:

1. Be a clearly separated layer over the observed changes, not a replacement for them.
2. Use explicit, documented, testable rules and explain which rule produced a label.
3. Avoid asserting certainty when consumer contract information is missing.
4. Prefer terms such as `potentially breaking` when the evidence supports only a possibility.
5. Allow consumer-specific rules or contract information to be supplied rather than pretending a universal rule works for every API.
6. Keep the default comparison useful without requiring the caller to configure impact rules.

This document does not define a future impact enum or API. Those details should be designed only if a concrete use case justifies the feature.

## Acceptance checklist

- [x] Decide whether impact classification belongs in v0.1.
- [x] Record why universal impact classification is deferred.
- [x] Explain additions, removals, value changes, type changes, and arrays without overstating their impact.
- [x] Keep structural changes distinct from any future classification layer.
- [x] Document requirements for any future classification feature.
