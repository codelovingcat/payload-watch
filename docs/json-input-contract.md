# JSON Input Contract and Public API Proposal

**Status:** Implemented input contract with runtime validation and focused tests  
**Tracking issue:** [#3 — Define the JSON input contract and public comparison API](https://github.com/codelovingcat/payload-watch/issues/3)

This document describes the implemented public input contract and runtime validator. The behavior is covered by the tests and the package's API reference.

## 1. Public API

The public entry point is proposed to be a synchronous function:

```ts
comparePayloads(previousPayload, currentPayload)
```

- `previousPayload` is the known-good baseline.
- `currentPayload` is the newly observed value.
- The function compares values already supplied by the caller.
- It performs no HTTP requests, file access, or other I/O.
- It must not mutate either input.
- It returns the structured `ComparisonReport` defined in [Issue #4 — Design the change model and JSON path format](https://github.com/codelovingcat/payload-watch/issues/4).

The function will be synchronous because the MVP compares in-memory values only. It should not return a `Promise` or hide network behavior behind the API.

## 2. Accepted JSON data model

The TypeScript aliases in `src/json-value.ts` express the JSON value model:

- `JsonPrimitive`: `string | number | boolean | null`
- `JsonArray`: a readonly array of JSON values
- `JsonObject`: an object whose string-keyed values are JSON values
- `JsonValue`: any JSON primitive, array, or object

The root input may be an object, array, string, finite number, boolean, or `null`. The API does not require every input to be an object.

These types are exported from the package entry point as type-only exports. They describe valid inputs at compile time; they cannot express every runtime condition (for example, finite numbers or circular references), so runtime validation is still required.

## 3. Values that are not valid JSON inputs

PayloadWatch accepts JSON data, not arbitrary JavaScript object graphs. Runtime input validation is expected to reject unsupported values instead of silently coercing them or generating a misleading comparison.

The enforced rejection policy is:

- `undefined`, `bigint`, symbols, and functions.
- Non-finite numbers: `NaN`, `Infinity`, and `-Infinity`.
- Circular references.
- Sparse arrays (arrays with missing indexes).
- Dates, regular expressions, maps, sets, class instances, and other non-plain objects.
- Object properties represented by accessors (getters/setters), symbol keys, or non-enumerable own properties. JSON data contains ordinary string-keyed data properties only.

Plain records with either `Object.prototype` or a `null` prototype can represent JSON objects, provided their own properties meet the rules above. Arrays must be dense and contain only their indexed elements.

Invalid input throws `InvalidJsonInputError`, a `TypeError` subclass exported from the package entry point. It exposes the input name (`previousPayload` or `currentPayload`), the offending `path` as a JSON Pointer (the empty string identifies the root), and a concise `reason`. The message does not serialize the offending value or the payload. Validation inspects property descriptors rather than reading accessor properties, so rejected getters are not executed. The implementation and tests are tracked in [Issue #13 — Validate inputs and report actionable errors](https://github.com/codelovingcat/payload-watch/issues/13).

Human-readable validation messages escape terminal controls, Unicode line
separators and bidirectional formatting marks in property paths. The error's
`path` field remains the exact JSON Pointer, so display escaping does not change
programmatic error handling.

## 4. Missing fields and null

`null` is a valid JSON value. A missing object property is not itself a value: it is an absent key.

For example, the following objects are not equivalent:

```json
{ "nickname": null }
```

```json
{}
```

PayloadWatch treats the missing property and explicit `null` as distinct observable states: adding a property whose value is `null` is reported as `added`, and removing that property is reported as `removed`. Other equality rules, including primitive type distinctions, empty containers, and object-versus-array transitions, are documented with corresponding tests in [Comparison Semantics](comparison-semantics.md).

## 5. Strings versus parsed JSON values

The comparison API accepts JSON values, not JSON text.

Callers that have an HTTP response body as text should parse it first:

```ts
const previousPayload: unknown = JSON.parse(previousJsonText);
const currentPayload: unknown = JSON.parse(currentJsonText);

// After validation/narrowing to JsonValue:
const report = comparePayloads(previousPayload, currentPayload);
```

The `comparePayloads` function and `ComparisonReport` type are implemented, and runtime validation runs before either payload is compared. Callers may cast parsed values to `JsonValue` to satisfy the compile-time API, but runtime validation remains authoritative. An out-of-range JSON number (for example, `1e400`) can become a non-finite JavaScript number and is rejected; the validator also protects calls from unsafe casts and arbitrary JavaScript objects.

PayloadWatch will not parse JSON strings implicitly. A string supplied directly as a value is compared as a JSON string, not treated as serialized JSON.

## 6. Determinism and side effects

For the same valid pair of inputs, the comparison should produce equivalent findings in a stable order. It must not mutate the inputs. It must not log or transmit payload content automatically.

Deterministic ordering and the report model are finalized in Issue #4. Input immutability and deeper edge cases also have dedicated coverage in [Issue #14 — Guarantee stable results and avoid mutating input payloads](https://github.com/codelovingcat/payload-watch/issues/14).

## 7. What is decided here versus later

This issue proposes and documents:

- the name and synchronous nature of the public comparison function;
- the two-input contract (baseline, then current payload);
- support for all JSON root value kinds;
- the recursive TypeScript `JsonValue` input type;
- the policy of rejecting unsupported JavaScript-only values rather than coercing them;
- the distinction between missing object properties and explicit `null`.

The change result interfaces, JSON Pointer paths, change-kind literals, and `includeValues` option are defined in Issue #4 and implemented in `src/change-model.ts` and `src/compare.ts`. Runtime invalid-input handling is tracked separately.

## 8. Acceptance checklist

- [x] Supported JSON root values are defined.
- [x] Recursive TypeScript input types are exported.
- [x] The public comparison function's proposed name, parameters, and synchronous behavior are documented.
- [x] Non-JSON JavaScript inputs and invalid-input handling policy are documented.
- [x] Missing properties and explicit `null` are distinguished.
- [x] Runtime validation and actionable error behavior are implemented and covered by focused tests in Issue #13.
- [x] The structured report type and public comparison function are implemented based on the agreed change model.

The checkboxes intentionally distinguish design work from implementation work. Completing this issue defines the contract; later issues implement and verify runtime behavior.
