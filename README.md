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

The planned MVP will explore:

- **Added fields** — properties present in the new payload but not the baseline.
- **Removed fields** — properties present in the baseline but missing from the new payload.
- **Changed values** — properties whose values differ.
- **Type changes** — for example, `number → string` or `object → null`.
- **Nested differences** — changes inside deeply nested objects.
- **Array behavior** — explicit rules for comparing arrays so the results are predictable.
- **Readable reports** — a concise summary that points developers to the exact JSON path.
- **Structured results** — a result format suitable for tests, logs, CI checks, and other tools.

The public input and change-report contracts are defined. Implementation and tests are being added incrementally, and PayloadWatch will avoid silently treating observed differences as definite breaking changes.

## A basic example

After building the project locally, the current source-level API can be used like this:

```ts
import { comparePayloads } from "./dist/index.js";

const previousPayload = {
  id: 482,
  customer: { name: "Deniz" },
};

const currentPayload = {
  id: "482",
  customer: { fullName: "Deniz" },
};

const report = comparePayloads(previousPayload, currentPayload);
console.log(report.changes);
```

Each change has a kind, a JSON Pointer path, and type metadata. Before/after values are omitted by default and can be enabled with `{ includeValues: true }`. Arrays are compared by index; PayloadWatch does not infer insertions, moves, or object identity. Runtime input validation is a separate implementation step.

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

## Development roadmap

The GitHub Issues track the project from the first design decisions through testing and release preparation. The first 10 issues established the main workstreams; additional issues make the important technical and release tasks more explicit.

The proposed first-release boundaries and testable acceptance criteria live in [the MVP scope document](docs/mvp-scope.md). That document is the working agreement for v0.1; implementation details are finalized through the linked design issues.

The input contract and public API direction are documented in [JSON Input Contract and Public API Proposal](docs/json-input-contract.md). The recursive `JsonValue` types and synchronous `comparePayloads` function are implemented; index-based array comparison and runtime validation remain separate issues.
The change record types, JSON Pointer path rules, ordering, and opt-in value exposure are described in [Change Model and Path Format](docs/change-model.md). The index-by-index array policy is documented in [Array Comparison Policy](docs/array-comparison.md).

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

The tools are declared using compatible major-version ranges in `package.json`. A lockfile should be generated once dependencies can be installed from the npm registry. The package is marked private for now so it cannot be accidentally published before the public API, license, package metadata, and release checklist have been reviewed.

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
tests/
  tooling.test.ts      # Initial test-runner smoke test
  compare.test.ts      # Comparison-engine behavior tests
tsconfig.json          # Strict TypeScript compiler settings
vitest.config.ts       # Node.js test configuration
```

The toolchain, recursive `JsonValue` types, structured change model, and `comparePayloads` implementation are in place. The engine handles nested objects and arrays, primitive changes, additions/removals, type changes, deterministic traversal, and opt-in before/after values. Runtime validation is tracked in Issue #13. Package exports and published declaration files will be verified separately before release.


## Contributing and project status

This is an actively designed learning project. The goal is to build a useful tool while making the reasoning behind each design choice visible.

At this stage, there is no stable public API and the library is not published to npm. Please follow the GitHub Issues for the agreed scope and implementation progress.

---

**PayloadWatch — know what changed in your API payloads, and where to look next.**
