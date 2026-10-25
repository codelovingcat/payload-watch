# PayloadWatch Development Workflow

This guide covers the current local development path for PayloadWatch v0.1. It does not publish the package or imply that the npm package entry points are finalized.

## Prerequisites

- Node.js 22.12.0 or newer
- npm, included with Node.js
- Git

## From a checkout to a working build

The repository's tracked lockfile keeps dependency resolution reproducible. If `npm ci` fails because the lockfile and manifest disagree, stop and reconcile those files instead of silently switching to `npm install`.

Clone the repository and enter its directory. The repository commits a version-3 `package-lock.json`; use `npm ci` to install the pinned dependency tree from a fresh checkout.

```bash
git clone https://github.com/codelovingcat/payload-watch.git
cd payload-watch
npm ci
npm run build
npm run typecheck
npm test
```

Use `npm run test:watch` while developing tests. The tests use in-memory sample values; they do not make requests to live third-party APIs.

## Try the current API

After `npm run build`, create `example.mjs` in the repository root:

```js
import { comparePayloads, formatComparisonReport } from "./dist/index.js";

// Captured sample payloads for a fictional customer API.
// The library compares supplied values and does not perform this API request.
const baseline = {
  id: 482,
  status: "ready",
  customer: { name: "Deniz" },
};

const current = {
  id: "482",
  status: "ready",
  customer: { fullName: "Deniz" },
};

const report = comparePayloads(baseline, current);

console.log(formatComparisonReport(report));
console.log(report.changes);
```

Run it with:

```bash
node example.mjs
```

The report records the new `/customer/fullName` property, the removed `/customer/name` property, and the type change at `/id`. Paths are JSON Pointers. Array elements are compared by index; the library does not infer moves or match elements by identity.

The current input type is `JsonValue`. Only JSON-compatible data should be supplied. Runtime validation rejects unsupported JavaScript values with an `InvalidJsonInputError` that identifies the input and JSON Pointer path without serializing payload values (Issue #13). Before/after values are omitted by default because API payloads can be sensitive. Showing values in text output requires opting in both when comparing and when formatting.

## Inspect the package without publishing

After a successful build, inspect the artifact file list from the repository root:

```bash
npm pack --dry-run --json
```

This is a local package inspection; it does not publish to npm. The package allowlist is intended to include `package.json`, `README.md`, `docs/`, and the compiled `dist/` output—not source files, tests, development configuration, or dependencies. Compare the command's actual `files` list with that expectation. The artifact check must be repeated after package metadata or build output changes.

## What this workflow does not cover

- CI build, type-check, and test automation (Issue #21).
- Final package exports and declaration-file generation (Issue #22).
- License and contribution terms (Issue #23).
- Testing the packed artifact from a clean consumer project (Issue #25).
- Release versioning and publishing (Issues #26 and #27).

Keep the package private until the release checklist is reviewed. Do not publish from this workflow.
