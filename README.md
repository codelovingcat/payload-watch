# PayloadWatch

**Catch unexpected changes in JSON API responses before they turn into debugging sessions.**

PayloadWatch is a planned TypeScript-first library for comparing JSON API payloads and explaining what changed between a known-good response and a new one.

It is designed for developers who integrate with external services—such as commerce, payment, hiring, shipping, or CRM APIs—and need a faster way to answer a frustrating question:

> “The API used to work. What changed in the response?”

> **Project status:** Early planning. The API, rules, and behavior are being defined before implementation. The examples below describe the intended direction and are not a released or working API.

## Why PayloadWatch?

External APIs can change in ways that are easy to miss. A field may disappear, a value may change type, or an object may be reshaped. Your application may then receive unexpected data, fail validation, skip a workflow, or produce an error far away from the original cause.

For example, an integration may expect:

```json
{
  "id": 482,
  "status": "ready",
  "customer": {
    "name": "Deniz"
  }
}
```

A later response might look like this:

```json
{
  "id": "482",
  "status": "ready",
  "customer": {
    "fullName": "Deniz"
  }
}
```

At a glance, the response looks similar. But two important details changed:

- `id` changed from a number to a string.
- `customer.name` was replaced by `customer.fullName`.

PayloadWatch aims to make these differences explicit, with paths and useful context, instead of making a developer discover them by repeatedly inspecting logs and tracing application code.

## What are we building?

The first version will focus on a small, well-defined job: **compare two JSON-compatible payloads and return a clear, structured description of their differences.**

The planned MVP will explore:

- **Added fields** — properties present in the new payload but not the baseline.
- **Removed fields** — properties present in the baseline but missing from the new payload.
- **Changed values** — properties whose values differ.
- **Type changes** — for example, `number → string` or `object → null`.
- **Nested differences** — changes inside deeply nested objects.
- **Array behavior** — explicit rules for comparing arrays so the results are predictable.
- **Readable reports** — a concise summary that points developers to the exact JSON path.
- **Structured results** — a result format suitable for tests, logs, CI checks, and other tools.

The precise comparison rules and public API will be agreed on and tested as part of the project. We will avoid silently treating ambiguous changes as definite breaking changes.

## A conceptual example

The public API has not been designed yet. A future usage might look something like this:

```ts
// Concept only — not implemented API
const report = comparePayloads(previousResponse, currentResponse);

console.log(report.changes);
```

For the example above, a report should make changes clear in a form similar to:

```text
Payload changes detected

- TYPE_CHANGED  $.id
  number -> string

- FIELD_REMOVED  $.customer.name

- FIELD_ADDED  $.customer.fullName
```

This output is illustrative. Names, return types, JSON path syntax, and classification rules will be finalized through the design issues before implementation.

## Who is it for?

PayloadWatch is intended for developers who:

- integrate with third-party APIs they do not control;
- want to compare a saved response with a response captured later;
- investigate unexplained integration failures;
- maintain tests for external API contracts;
- want change reports that are easier to understand than a large raw JSON diff.

A useful scenario is an application that consumes a third-party commerce API. When a product, order, or customer response changes, a developer could compare the last known-good payload with the latest payload and see which fields changed.

## What PayloadWatch will—and will not—claim

A payload diff can show **what changed**. By itself, one or two JSON samples cannot always prove whether a change is breaking for every consumer. For example, adding an optional field may be harmless to one application but unexpected for another.

For that reason, PayloadWatch will distinguish observed differences from any policy-based assessment of their impact. If we introduce “potentially breaking” classifications, their rules must be explicit, documented, and tested.

### Initial scope

The first milestone is focused on comparing supplied JSON-compatible values. Snapshot files, a command-line interface, HTTP integrations, watch mode, and CI integrations may be considered after the core comparison behavior is reliable.

### Not the goal of the MVP

- Making HTTP requests to third-party services.
- Replacing API documentation, schemas, or contract tests.
- Claiming to infer every semantic or business-level API change.
- Automatically capturing or storing production credentials or sensitive responses.

Keeping the first release narrow should let us make the core behavior dependable before adding integrations.

## Design principles

- **Predictable:** the same inputs should produce the same change report.
- **Understandable:** every reported change should identify where it occurred and what was observed.
- **Type-safe:** use TypeScript to make the library's public API clear and useful to consumers.
- **Tested:** cover nested objects, arrays, null values, missing properties, and type changes.
- **Careful with data:** avoid logging full payloads or sensitive values by default; decide how before/after values should be exposed.
- **Small and focused:** favor a clear core over an oversized feature set.

## Development plan

The project will be developed in small, traceable steps through GitHub Issues. The initial work is to:

1. Define the MVP and the use cases it supports.
2. Decide what counts as a JSON value and how inputs are supplied.
3. Design the change-result model and path format.
4. Implement deterministic recursive comparison.
5. Define and implement array behavior.
6. Decide how observed changes may be classified.
7. Design a readable report format.
8. Add tests for normal and edge cases.
9. Document examples and limitations.
10. Prepare the project for packaging and future npm publication.

These are planning milestones, not claims that the features have already been implemented.

## Technology direction

- **TypeScript** for the library and public types.
- **Node.js** as the development and test runtime.
- **npm** for package management and, when ready, distribution.
- **Vitest** is a candidate for the test suite; the project will confirm its tooling in the setup issue.

Final runtime support, module format, package configuration, and release strategy will be decided before publishing.

## Contributing and project status

This is an actively designed learning project. The goal is to build a useful tool while making the reasoning behind each design choice visible.

At this stage, there is no stable public API and the library is not published to npm. Please follow the GitHub Issues for the agreed scope and implementation progress.

---

**PayloadWatch — know what changed in your API payloads, and where to look next.**
