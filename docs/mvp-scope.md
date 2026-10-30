# PayloadWatch v0.1 — MVP Scope

**Status:** Historical MVP scope agreement (original core-only boundaries; retained for design traceability)  
**Tracking issue:** [#1 — Define the MVP scope and acceptance criteria](https://github.com/codelovingcat/payload-watch/issues/1)

This document records the **original proposed scope**, so its future-tense decisions and exclusions are preserved as historical requirements rather than rewritten. The core comparison implementation, tests and packaging now exist. In addition, the optional local CLI and exact `ignorePaths` were developed in later issues and are **included in the unpublished `0.1.0` release candidate**. For the actual candidate behavior, see [Public API Reference](api-reference.md), [CLI Usage](cli.md), [Ignore Paths](ignore-paths.md) and [0.1.0 Release Notes](release-notes-0.1.0.md).

## 1. Problem and target user

PayloadWatch helps developers investigate unexpected changes in JSON responses from external APIs they do not control.

For example, an integration may have been built against a response containing `customer.name`, then start receiving `customer.fullName` instead. The application may fail far away from the point where the response entered the system. Developers then have to inspect logs and compare large JSON documents by hand.

PayloadWatch aims to answer the first diagnostic question quickly:

**What changed between the last known-good JSON payload and the new payload, and where did it change?**

The primary user is a developer who can obtain two JSON samples and wants a deterministic, readable comparison. PayloadWatch does not need access to the third-party API itself.

## 2. MVP statement

PayloadWatch v0.1 will be a small, TypeScript-first library that accepts two caller-provided JSON values—a baseline and a current value—and returns a structured report describing their differences.

The library should be predictable, testable, and usable without network access. It should report observed differences, not pretend to know every consumer's business rules.

## 3. In scope for v0.1

### Inputs and comparison

- Accept two JSON-compatible values supplied by the caller.
- Support JSON root values: objects, arrays, strings, numbers, booleans, and `null`.
- Compare nested objects recursively.
- Detect properties added to or removed from objects.
- Detect a primitive value changing while its JSON type stays the same.
- Detect JSON type changes, including relevant changes involving `null`, objects, arrays, and primitives.
- Compare arrays **by index**. Report differences at indexes and report items beyond the shorter array's length as additions or removals.
- Treat a missing object property as different from a property explicitly set to `null`.
- Return the same ordered findings for the same input pair.
- Identify each finding with a change kind and a path to the affected location.
- Return structured results that a program can consume and provide a simple, readable representation of those findings.

### Developer experience and quality

- Provide TypeScript types for the public API.
- Document the accepted input contract, comparison behavior, examples, and limitations.
- Cover ordinary behavior and edge cases with automated tests.
- Avoid mutating the caller's input values.
- Work locally without making HTTP requests or sending payload data anywhere.

Some implementation details—such as the exact public function signature, result types, path escaping, invalid-input errors, and how report values are exposed—will be specified in their focused design issues before they are implemented.

## 4. Explicit array policy

The MVP compares array elements by their index. It will not attempt to infer that an object moved, match objects by an assumed ID property, or guess that an element was renamed.

For example, reordering two objects can produce changes at indexes `0` and `1`. This is intentional for the first version: it is simpler to explain and test than heuristic matching.

Advanced array matching may be considered later if a real use case justifies its complexity.

## 5. What PayloadWatch will not do in the MVP

The following are out of scope for v0.1:

- Make live requests to external APIs or monitor their uptime.
- Capture, schedule, or persist API snapshots automatically.
- Include a command-line interface (CLI).
- Run as a background service or watch for changes continuously.
- Fetch API schemas or infer contracts from a provider's documentation.
- Compare OpenAPI or JSON Schema definitions.
- Infer that similarly named removed/added properties are a rename.
- Match array objects by ID, detect moves, or use heuristic array alignment.
- Decide with certainty whether a change breaks every consumer.
- Include domain-specific business rules, authentication, or provider-specific SDKs.
- Send, upload, or automatically log full payloads.

These may be useful future directions, but they should not block a small, reliable first release.

## 6. Difference reporting policy

PayloadWatch reports what it can observe from the two input values:

- a property or array item was added;
- a property or array item was removed;
- a value changed;
- a JSON type changed.

**Impact classification is deferred from v0.1.** The MVP reports observed structural differences only; it does not emit a breaking, non-breaking, or unknown impact label. The same structural change can affect consumers differently depending on their schema, validation settings, optionality assumptions, and application logic. For example, removing a required field may break one integration, while removing an unused optional field may have no visible effect.

A later release may add an explicit, separately designed classification layer if a concrete consumer-specific rule set can be provided. Such a layer must use documented, tested rules, preserve the original observed changes, and say *potentially breaking* rather than claim certainty when the consumer contract is unavailable.

The report must point to the affected location. The change types and path syntax are defined in [Change Model and Path Format](change-model.md). See the [Impact Classification Policy](impact-classification-policy.md) for examples and the rationale for deferring classification.

## 7. Acceptance criteria

The v0.1 core comparison is ready for release consideration when all of the following are true:

- [ ] A developer can compare two supplied JSON values without network access.
- [ ] Equal inputs produce an empty change report.
- [ ] Added object properties are reported with the correct location.
- [ ] Removed object properties are reported with the correct location.
- [ ] Changed primitive values are reported with the correct location.
- [ ] Type changes are distinguished from value changes.
- [ ] Nested object differences are reported at the correct location.
- [ ] Missing properties and explicit `null` values are treated distinctly.
- [ ] Arrays are compared by index, and added/removed indexes are reported according to the documented policy.
- [ ] Paths remain unambiguous for property names that need escaping.
- [ ] The same inputs produce deterministic results, and comparison does not mutate either input.
- [ ] Unsupported non-JSON JavaScript values are handled according to a documented input/error contract.
- [ ] Reports are available in a documented structured form and a developer-readable form.
- [ ] Tests cover normal cases and agreed edge cases.
- [ ] The package builds, passes tests and type checks, and can be imported from a clean consumer project.
- [ ] Documentation examples match the implemented API.
- [ ] The packed npm artifact contains only intended files; no release is published until release checks are reviewed.

## 8. Example of intended behavior

Given this baseline:

```json
{
  "id": 482,
  "status": "ready",
  "customer": {
    "name": "Deniz"
  }
}
```

And this current payload:

```json
{
  "id": "482",
  "status": "ready",
  "customer": {
    "fullName": "Deniz"
  }
}
```

The report should make at least these observations clear:

- `id` changed from a number to a string.
- `customer.name` was removed.
- `customer.fullName` was added.

PayloadWatch will not infer that `name` and `fullName` are definitely the same conceptual field. It will report the observable removal and addition.

This is an illustrative example; it does not define the final public API or exact output schema.

## 9. Decisions intentionally left to focused issues

To keep this issue about scope rather than implementation detail, the following are tracked separately:

- [#2 — TypeScript package and test tooling](https://github.com/codelovingcat/payload-watch/issues/2)
- [#3 — JSON input contract and public comparison API](https://github.com/codelovingcat/payload-watch/issues/3)
- [#4 — Change model and JSON path format](https://github.com/codelovingcat/payload-watch/issues/4)
- [#6 — Deterministic array comparison](https://github.com/codelovingcat/payload-watch/issues/6)
- [#7 — Impact-classification policy](https://github.com/codelovingcat/payload-watch/issues/7)
- [#8 — Readable summaries and structured reports](https://github.com/codelovingcat/payload-watch/issues/8)
- [#9 — Regression tests and edge cases](https://github.com/codelovingcat/payload-watch/issues/9)
- [#13 — Invalid input handling](https://github.com/codelovingcat/payload-watch/issues/13)
- [#19 — Safe handling of payload values](https://github.com/codelovingcat/payload-watch/issues/19)
- [#21 — Continuous integration](https://github.com/codelovingcat/payload-watch/issues/21)
- [#22 — Package exports and TypeScript declarations](https://github.com/codelovingcat/payload-watch/issues/22)
- [#25 — Test the packed artifact in a clean consumer project](https://github.com/codelovingcat/payload-watch/issues/25)

## 10. Definition of done for this scope issue

This issue is ready to close when the scope and acceptance criteria have been reviewed, the README links to this document, and the project owner approves the proposed MVP boundaries. Implementation issues remain open until the corresponding code, tests, and documentation have been reviewed separately.
