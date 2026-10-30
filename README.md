# PayloadWatch

**Catch unexpected changes in JSON API responses before they turn into debugging sessions.**

PayloadWatch is a TypeScript-first library for comparing JSON API payloads and explaining what changed between a known-good response and a new one. Its initial feature set is implemented and tested as a **private, unpublished `0.1.0` release candidate**.

It is designed for developers who integrate with external services—such as commerce, payment, hiring, shipping, or CRM APIs—and need a faster way to answer a frustrating question:

> “The API used to work. What changed in the response?”

> **Project status:** The `0.1.0` candidate includes the synchronous TypeScript/ESM comparison API, runtime JSON validation, readable and structured reports, optional exact `ignorePaths`, and a local JSON-file CLI. Builds, tests and consumer-package checks run in CI (Linux Node.js 22/24; Windows Node.js 22 CLI smoke). **Not yet published on npm:** `private: true` remains set. APIs may change before `1.0`.

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

## What does PayloadWatch do?

The implemented `0.1.0` release candidate focuses on a small, well-defined job: **compare two caller-provided JSON-compatible payloads and return a clear, structured description of their differences.**

The comparison engine reports:

- **Added fields or array elements** — values present only in the current payload.
- **Removed fields or array elements** — values present only in the previous payload.
- **Changed primitive values** — values that differ while keeping the same JSON type.
- **Type changes** — for example, `number → string` or `object → null`.
- **Nested differences** — precise locations within objects and arrays.
- **Readable summaries and structured reports** — text for people and typed records for code.

Runtime validation, regression tests, ESM package exports, generated TypeScript declarations, and local archive/consumer checks are implemented. **Public npm publication is the remaining release gate**, tracked in [Issue #27](https://github.com/codelovingcat/payload-watch/issues/27). PayloadWatch reports observed structural differences rather than asserting universal breaking impact.

## Quick start

The candidate exposes an ESM API through the compiled package. **Until it is published**, use a source checkout or install a locally packed archive. From a clean checkout, install dependencies and build:

```bash
npm ci
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

## Realistic example: order API drift

The [synthetic order fixtures](examples/order-payloads/) show a common API update. Across the two snapshots, the order ID changes from a number to a string, `customer.name` is replaced by `customer.fullName`, an item quantity and shipping details change, and a new item appears. All names, IDs, addresses, and prices are fictional; the email uses the reserved `.invalid` domain, and no live API is called.

Run `npm test` to see the fixture-based end-to-end assertions in `tests/order-drift.test.ts`. The expected report contains these seven paths:

```text
/customer/fullName
/customer/name
/items/0/quantity
/items/2
/orderId
/shipping/address/city
/shipping/method
```

The [unchanged fixture](examples/order-payloads/unchanged.json) is also tested to ensure an equivalent pair returns `No changes detected.`.

## Optional ignore paths (included in the 0.1.0 candidate)

Pass `{ ignorePaths: ["/metadata/requestId"] }` to ignore an exact JSON Pointer path and its descendants. See [Ignore Paths](docs/ignore-paths.md) for escaping, edge cases and risks.

## Optional local CLI (included in the 0.1.0 candidate)

After `npm ci && npm run build`, compare two JSON files:

```bash
node bin/payload-watch.mjs compare examples/order-payloads/baseline.json examples/order-payloads/current.json
```

The executable is also named `payload-watch` when this package is installed from a local archive. The CLI is an optional file-reading layer; the core library remains synchronous and does not read files or make network calls. The CLI supports text or machine-readable JSON output, plus `--fail-on-change` (exit code `1` on differences); usage, file and parse errors return `2`. See [CLI Usage](docs/cli.md).

## API reference and runnable examples

Start with the [Public API Reference](docs/api-reference.md) for every exported function, type, option and error, plus troubleshooting and known limitations. After `npm run build`, run `node examples/api-reference.mjs` for an executable walkthrough using synthetic order API snapshots. The example is also checked by CI.

## Packed package installation checks

For a reproducible local verification of the **actual npm tarball**, run `npm ci`, `npm run build`, then `npm run check:consumer`. It packs and installs the archive into an isolated temporary Node.js project and checks ESM runtime imports plus TypeScript NodeNext and Bundler type resolution. See [Clean Consumer Installation](docs/consumer-installation.md). This does not publish the package.

## Supported inputs and comparison rules

Nesting is limited to **512 levels from root depth 0**. Each object property or
array element adds one level. Excess depth produces `InvalidJsonInputError`
with the input and path (CLI exit `2`), including inside ignored subtrees.

The public input type is `JsonValue`: a JSON object, array, string, finite number, boolean, or `null`. Pass parsed data values, not a string containing serialized JSON. Runtime validation rejects unsupported JavaScript values before comparison and throws `InvalidJsonInputError` with the input name, a JSON Pointer path, and a concise reason. The error never serializes payload values; see [Issue #13](https://github.com/codelovingcat/payload-watch/issues/13) and the [JSON Input Contract](docs/json-input-contract.md).

PayloadWatch reports four change kinds:

- `added`: a property or array element exists only in the current value.
- `removed`: a property or array element exists only in the previous value.
- `value-changed`: a primitive value changed but kept its JSON type.
- `type-changed`: the JSON type changed at that location.

Paths use JSON Pointer (RFC 6901): the empty string `""` denotes the root, `~` is escaped as `~0`, and `/` within a property key is escaped as `~1`. Arrays are compared by index; the library does not infer moves or match objects by identity. Before/after values are omitted by default. For readable output, values require an opt-in on both `comparePayloads` and `formatComparisonReport`. When included, object and array values are detached snapshots, so changing a report value does not mutate either input payload.

## Privacy and data handling

PayloadWatch compares the values supplied by the caller; it does not make network requests, log payload values, or write payload data to files. Structured reports omit before/after values by default. Enabling `includeValues` puts detached copies of changed values into the returned report, so treat that report as sensitive. The text formatter also requires its own `includeValues: true` opt-in before showing any values. Validation errors identify the input, JSON Pointer path, and reason without serializing payload values; paths still contain property names, which may themselves be sensitive. See [Privacy and Data Handling](docs/privacy-and-data-handling.md) for guidance.

The v0.1 release reports structural observations only. It does not label changes as breaking or non-breaking; see [Impact Classification Policy](docs/impact-classification-policy.md). Equality, missing-versus-null behavior, and type transitions are documented in [Comparison Semantics](docs/comparison-semantics.md). JSON Pointer construction, including unusual property names, is documented in [JSON Pointer Path Rules](docs/json-pointer-paths.md). For the detailed contract, see [JSON Input Contract](docs/json-input-contract.md), [Change Model and Path Format](docs/change-model.md), and [Array Comparison Policy](docs/array-comparison.md).

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

### Original MVP scope and actual release candidate

The original MVP scoped only the synchronous core comparison engine. The separately developed **local-file CLI and exact `ignorePaths`** option are now implemented and deliberately included in the private `0.1.0` candidate. Live HTTP integrations, background monitoring, automatic snapshot collection and a dedicated CI Action are **not** included. See the [historical MVP scope](docs/mvp-scope.md) and [release notes](docs/release-notes-0.1.0.md).

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

## Versioning and changes

See [Versioning and Release Policy](docs/versioning-policy.md) and [CHANGELOG](CHANGELOG.md). PayloadWatch is a **private `0.1.0` release candidate**, not yet published on npm. No stable API promise has been made.

## First release candidate — not yet published

The first npm version candidate is **`0.1.0`**, including the core JSON comparison API, optional `ignorePaths`, and the local `payload-watch` CLI. The package is still `private: true`: **do not run `npm install payload-watch` expecting this version to exist on npm yet**. From a checkout, use `npm ci && npm run build && npm run check:release-candidate`, along with the existing tests. See [0.1.0 Release Notes](docs/release-notes-0.1.0.md) and [First Release Checklist](docs/first-release-checklist.md). No `npm publish`, Git tag or GitHub Release has been created.

## First npm release readiness

Publication is not automatic. Review the [First Release Checklist](docs/first-release-checklist.md) and use `npm run release:preflight` to report local metadata blockers. The check does **not** publish and is expected to fail until an authorized release configuration is selected.

## Development roadmap

The GitHub Issues track the project from the first design decisions through testing and release preparation. The first 10 issues established the main workstreams; additional issues make the important technical and release tasks more explicit.

The original core-only boundaries and acceptance criteria are preserved in the [historical MVP scope document](docs/mvp-scope.md). The **actual private `0.1.0` candidate** also includes the optional CLI and `ignorePaths` described in [release notes](docs/release-notes-0.1.0.md); historical scope exclusions are not a description of the current package.

The input contract and public API direction are documented in [JSON Input Contract and Public API Proposal](docs/json-input-contract.md). The recursive `JsonValue` types and synchronous `comparePayloads` function are implemented, and arrays are compared deterministically by index. Runtime input validation is implemented under Issue #13 and documented in the JSON Input Contract.
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

The [Post-MVP Review](docs/post-mvp-review.md) records which extensions have concrete evidence, where existing tools overlap, and which ideas remain unvalidated. It does not expand the first-release scope.

### Phase 5 — Post-MVP developer experience (implemented extensions)

These items were originally planned **after the core MVP**. CLI file comparison, JSON/text modes, exit codes and exact-path ignores have since been implemented and included in the private `0.1.0` candidate. Larger extensions remain subject to evidence and separate decisions.

- [#15 — Add a CLI for comparing baseline and current JSON files](https://github.com/codelovingcat/payload-watch/issues/15)
- [#16 — Add CLI output modes and CI-friendly exit codes](https://github.com/codelovingcat/payload-watch/issues/16)
- [#17 — Support ignore paths for known volatile fields](https://github.com/codelovingcat/payload-watch/issues/17)
- [#28 — Review post-MVP extensions and prioritize only validated needs](https://github.com/codelovingcat/payload-watch/issues/28)

This roadmap records **development history**, not a list of unfinished features. Some originally post-MVP issues are completed and included in the current candidate; other ideas remain uncommitted. Only the private candidate scope and [release checklist](docs/first-release-checklist.md) determine what can be published.

## Technology and development setup

The initial development toolchain is configured as follows:

- **Node.js 22.12 or newer** — the minimum runtime is set to meet Vitest 5's documented Node.js requirement.
- **TypeScript 7** — compiles the source and runs strict type checks.
- **Vitest 5** — runs the unit test suite.
- **Vite 8** — installed explicitly because Vitest 5 uses Vite as a peer dependency.
- **npm** — installs development dependencies and runs project scripts.

The repository tracks a version-3 `package-lock.json`, and `npm ci` is used for reproducible installs. ESM package exports, generated declarations and clean archive-consumer tests are implemented and tested by CI on Node.js 22/24. The package is a private `0.1.0` release candidate with MIT licensing; public npm name and publish permissions must still be verified.

### Prerequisites

- Node.js 22.12.0 or newer.
- npm (included with Node.js).

### Get started

Clone the repository and enter its directory, then run:

```bash
npm ci
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
  json-input-validation.ts # Runtime JSON contract validation and typed errors
  change-model.ts      # Structured change/report types
  compare.ts           # Recursive object, array, and primitive comparison engine
  json-pointer.ts      # Internal RFC 6901 path segment builder
  report-format.ts     # Human-readable report formatter
tests/
  tooling.test.ts      # Initial test-runner smoke test
  compare.test.ts      # Comparison-engine behavior tests
  json-pointer.test.ts # Focused JSON Pointer path tests
  regression.test.ts   # Focused JSON edge-case regression suite
  comparison-semantics.test.ts # Explicit equality and null semantics tests
  json-input-validation.test.ts # Runtime input validation and error tests
  report-format.test.ts # Readable report formatting tests
tsconfig.json          # Strict TypeScript compiler settings
vitest.config.ts       # Node.js test configuration
```

The toolchain, recursive `JsonValue` types, structured change model, `comparePayloads` implementation, and runtime input validation are in place. The engine handles nested objects and arrays, primitive changes, additions/removals, type changes, deterministic traversal, and opt-in before/after values. The ESM package entry points and generated TypeScript declarations are already verified in the isolated consumer checks. No npm publication has taken place.


## Contributing and project status

PayloadWatch is an actively developed TypeScript-first learning and library project. Discussions and reproducible bug reports are welcome. Read [Contributing](CONTRIBUTING.md) for issue templates, local checks, pull-request expectations, and security-sensitive test data, and the [Code of Conduct](CODE_OF_CONDUCT.md) for collaboration standards.

**License:** PayloadWatch is available under the [MIT License](LICENSE) (Copyright © 2026 codelovingcat). Reuse, modification, and commercial use are permitted under its terms; retain the copyright and license notice. The decision is recorded in [Licensing Decision](docs/licensing-decision.md). We welcome original contributions under the same license; see [Contributing](CONTRIBUTING.md).

The `0.1.0` candidate is not published to npm and remains `private: true`. The current ESM package export, generated TypeScript declarations, and consumer checks are described in [Package Entry Points](docs/package-entrypoints.md); release requirements are tracked in [Release Readiness](docs/release-readiness.md).

---

**PayloadWatch — know what changed in your API payloads, and where to look next.**
