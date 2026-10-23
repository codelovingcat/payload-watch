# PayloadWatch

**Catch unexpected changes in JSON API responses before they turn into debugging sessions.**

PayloadWatch is a TypeScript-first library under development for comparing JSON API payloads and explaining what changed between a known-good response and a new one.

It is designed for developers who integrate with external services—such as commerce, payment, hiring, shipping, or CRM APIs—and need a faster way to answer a frustrating question:

> “The API used to work. What changed in the response?”

> **Project status:** Early implementation. The synchronous `comparePayloads` API compares nested objects, arrays by index, and primitive values. Runtime input validation remains tracked separately. The package is not published, and the API may continue to evolve.

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

The current implementation compares two supplied JSON-compatible values and reports:

- **Added fields or array elements** — values present only in the current payload.
- **Removed fields or array elements** — values present only in the previous payload.
- **Changed primitive values** — values that differ while keeping the same JSON type.
- **Type changes** — for example, `number → string` or `object → null`.
- **Nested differences** — precise locations within objects and arrays.
- **Readable summaries and structured reports** — text for people and typed records for code.

The core comparison and regression coverage are implemented. Runtime validation for unsupported JavaScript values, package exports and declarations, and release checks remain separate work. PayloadWatch reports observed structural differences rather than asserting universal breaking impact.

## Quick start

PayloadWatch currently exposes a source-built ESM API. From a clean checkout, install the development dependencies and build the library:

```bash
npm install
npm run build
```

Create `example.mjs` in the repository root and run it with `node example.mjs`:

```js
import { comparePayloads, formatComparisonReport } from "./dist/index.js";

// Sample snapshots from a fictional third-party customer API.
// No live API request is made by PayloadWatch.
const previousPayload = {
  id: 482,
  status: "ready",
  customer: { name: "Deniz" },
};

const currentPayload = {
  id: "482",
  status: "ready",
  customer: { fullName: "Deniz" },
};

const report = comparePayloads(previousPayload, currentPayload);

console.log(formatComparisonReport(report));
console.log(report.changes);
```

The readable summary is:

```text
3 changes detected:
1. Added value at /customer/fullName (current type: string)
2. Removed value at /customer/name (previous type: string)
3. Type changed at /id (number → string)
```

`comparePayloads` returns the structured report; `formatComparisonReport` turns it into text. Both functions operate on the values passed to them—they do not fetch third-party data, log it automatically, or transmit it anywhere.

## Supported inputs and comparison rules

The public input type is `JsonValue`: a JSON object, array, string, finite number, boolean, or `null`. Pass parsed data values, not a string containing serialized JSON. Runtime validation for unsupported JavaScript values is not implemented yet (see [Issue #13](https://github.com/codelovingcat/payload-watch/issues/13)), so callers must supply valid JSON data rather than rely on the library to reject every invalid runtime value.

PayloadWatch reports four change kinds:

- `added`: a property or array element exists only in the current value.
- `removed`: a property or array element exists only in the previous value.
- `value-changed`: a primitive value changed but kept its JSON type.
- `type-changed`: the JSON type changed at that location.

Paths use JSON Pointer (RFC 6901): the empty string `""` denotes the root, `~` is escaped as `~0`, and `/` within a property key is escaped as `~1`. Arrays are compared by index; the library does not infer moves or match objects by identity. Before/after values are omitted by default. For readable output, values require an opt-in on both `comparePayloads` and `formatComparisonReport`.

The v0.1 release reports structural observations only. It does not label changes as breaking or non-breaking; see [Impact Classification Policy](docs/impact-classification-policy.md). JSON Pointer construction, including unusual property names, is documented in [JSON Pointer Path Rules](docs/json-pointer-paths.md). For the detailed contract, see [JSON Input Contract](docs/json-input-contract.md), [Change Model and Path Format](docs/change-model.md), and [Array Comparison Policy](docs/array-comparison.md).

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

For the v0.1 MVP, PayloadWatch reports structural differences only and does not label them as breaking, non-breaking, or unknown. A JSON diff alone cannot reliably establish impact for every consumer; the reasoning and examples are documented in [Impact Classification Policy](docs/impact-classification-policy.md). A future consumer-specific classification layer would need explicit, testable rules and must preserve the underlying observed changes.

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

## Development roadmap

The GitHub Issues track the project from the first design decisions through testing and release preparation. The first 10 issues established the main workstreams; additional issues make the important technical and release tasks more explicit.

The proposed first-release boundaries and testable acceptance criteria live in [the MVP scope document](docs/mvp-scope.md). That document is the working agreement for v0.1; implementation details are finalized through the linked design issues.

The input contract and public API direction are documented in [JSON Input Contract and Public API Proposal](docs/json-input-contract.md). The recursive `JsonValue` types and synchronous `comparePayloads` function are implemented, and arrays are compared deterministically by index. Runtime input validation remains tracked in Issue #13.
The change record types, JSON Pointer path rules, ordering, and opt-in value exposure are described in [Change Model and Path Format](docs/change-model.md). The index-by-index array policy is documented in [Array Comparison Policy](docs/array-comparison.md). The v0.1 decision to defer impact classification is documented in [Impact Classification Policy](docs/impact-classification-policy.md). The readable summary and data-exposure safeguards are described in [Report Format](docs/report-format.md).

### Phase 1 — Scope and design

- [#1 — Define the MVP scope and acceptance criteria](https://github.com/codelovingcat/payload-watch/issues/1)
- [#3 — Define the JSON input contract and public comparison API](https://github.com/codelovingcat/payload-watch/issues/3)
- [#4 — Design the change model and JSON path format](https://github.com/codelovingcat/payload-watch/issues/4)
- [#11 — Specify equality, missing-field, and null semantics](https://github.com/codelovingcat/payload-watch/issues/11)
- [#12 — Encode JSON paths safely for unusual property names](https://github.com/codelovingcat/payload-watch/issues/12)
- [#13 — Validate inputs and report actionable errors](https://github.com/codelovingcat/payload-watch/issues/13)

### Phase 2 — Build the core comparison engine

- [#2 — Bootstrap the TypeScript package and test tooling](https://github.com/codelovingcat/payload-watch/issues/2)
- [#5 — Implement recursive object and primitive comparisons](https://github.com/codelovingcat/payload-watch/issues/5)
- [#6 — Define and implement deterministic array comparison](https://github.com/codelovingcat/payload-watch/issues/6)
- [#7 — Define the impact-classification policy](https://github.com/codelovingcat/payload-watch/issues/7)
- [#14 — Guarantee stable results and avoid mutating input payloads](https://github.com/codelovingcat/payload-watch/issues/14)

### Phase 3 — Reports, examples, and tests

- [#8 — Produce readable summaries and stable structured reports](https://github.com/codelovingcat/payload-watch/issues/8)
- [#9 — Cover edge cases with a focused regression test suite](https://github.com/codelovingcat/payload-watch/issues/9)

The core comparison regression cases and their expected behavior are tracked in [Regression Test Matrix](docs/regression-test-matrix.md). Run the automated suite from the repository root with `npm test`.

The end-to-end local workflow and remaining package-release checks are documented in [Development Workflow](docs/development-workflow.md) and [Release Readiness](docs/release-readiness.md).
- [#18 — Create realistic third-party API drift fixtures](https://github.com/codelovingcat/payload-watch/issues/18)
- [#19 — Define safe handling of payload values in reports and errors](https://github.com/codelovingcat/payload-watch/issues/19)
- [#20 — Measure behavior on large and deeply nested payloads](https://github.com/codelovingcat/payload-watch/issues/20)
- [#24 — Write complete API reference and practical troubleshooting examples](https://github.com/codelovingcat/payload-watch/issues/24)
- [#10 — Document the end-to-end workflow and validate package output](https://github.com/codelovingcat/payload-watch/issues/10)

### Phase 4 — Package quality and release readiness

- [#21 — Run build, tests, and type checks on GitHub Actions](https://github.com/codelovingcat/payload-watch/issues/21)
- [#22 — Define package exports and TypeScript declaration output](https://github.com/codelovingcat/payload-watch/issues/22)
- [#23 — Choose a license and document contribution expectations](https://github.com/codelovingcat/payload-watch/issues/23)
- [#25 — Test the packed artifact from a clean consumer project](https://github.com/codelovingcat/payload-watch/issues/25)
- [#26 — Define semantic versioning and changelog policy](https://github.com/codelovingcat/payload-watch/issues/26)
- [#27 — Prepare and publish the first npm release](https://github.com/codelovingcat/payload-watch/issues/27)

### Phase 5 — Post-MVP developer experience

These are deliberately later additions. The first version should prove that the core comparison behavior is dependable before we expand into a terminal workflow.

- [#15 — Add a CLI for comparing baseline and current JSON files](https://github.com/codelovingcat/payload-watch/issues/15)
- [#16 — Add CLI output modes and CI-friendly exit codes](https://github.com/codelovingcat/payload-watch/issues/16)
- [#17 — Support ignore paths for known volatile fields](https://github.com/codelovingcat/payload-watch/issues/17)
- [#28 — Review post-MVP extensions and prioritize only validated needs](https://github.com/codelovingcat/payload-watch/issues/28)

This roadmap separates the focused library MVP from later conveniences. Having an issue in the backlog does not mean it is already implemented or must ship in the first release; each issue has its own acceptance criteria.

## Technology and development setup

The initial development toolchain is configured as follows:

- **Node.js 22.12 or newer** — the minimum runtime is set to meet Vitest 5's documented Node.js requirement.
- **TypeScript 7** — compiles the source and runs strict type checks.
- **Vitest 5** — runs the unit test suite.
- **Vite 8** — installed explicitly because Vitest 5 uses Vite as a peer dependency.
- **npm** — installs development dependencies and runs project scripts.

The tools are declared using compatible version ranges in `package.json`. This repository does not yet commit a `package-lock.json`, so `npm install` can resolve different compatible versions at different times; do not use `npm ci` until a reviewed lockfile is committed. The package remains private and explicitly whitelists `dist/`, `README.md`, and `docs/` for packing. This is not a release-ready package yet: exports and declaration files, a license, a lockfile, and a clean consumer-project check remain outstanding.

### Prerequisites

- Node.js 22.12.0 or newer.
- npm (included with Node.js).

### Get started

Clone the repository and enter its directory, then run:

```bash
npm install
npm run build
npm run typecheck
npm test
```

For watch mode while developing tests:

```bash
npm run test:watch
```

### Project structure

```text
src/
  index.ts             # Public API and type exports
  json-value.ts        # Recursive JSON input types
  change-model.ts      # Structured change/report types
  compare.ts           # Recursive object, array, and primitive comparison engine
  json-pointer.ts      # Internal RFC 6901 path segment builder
  report-format.ts     # Human-readable report formatter
tests/
  tooling.test.ts      # Initial test-runner smoke test
  compare.test.ts      # Comparison-engine behavior tests
  json-pointer.test.ts # Focused JSON Pointer path tests
  regression.test.ts   # Focused JSON edge-case regression suite
  report-format.test.ts # Readable report formatting tests
tsconfig.json          # Strict TypeScript compiler settings
vitest.config.ts       # Node.js test configuration
```

The toolchain, recursive `JsonValue` types, structured change model, and `comparePayloads` implementation are in place. The engine handles nested objects and arrays, primitive changes, additions/removals, type changes, deterministic traversal, and opt-in before/after values. Runtime validation is tracked in Issue #13. Package exports and published declaration files will be verified separately before release.


## Contributing and project status

This is an actively designed learning project. The goal is to build a useful tool while making the reasoning behind each design choice visible.

The comparison and report-formatting functions are implemented, but the npm package entry points and TypeScript declaration output are not finalized. The package is not published to npm and remains marked `private`; release-readiness work is tracked in [Release Readiness](docs/release-readiness.md). Please follow the GitHub Issues for the agreed scope and implementation progress.

---

**PayloadWatch — know what changed in your API payloads, and where to look next.**
