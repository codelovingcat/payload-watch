# PayloadWatch

**Detect changes between two JSON API responses, with typed reports and readable explanations.**

PayloadWatch is a synchronous TypeScript/JavaScript library and an optional local-file CLI. It reports added or removed fields, primitive value changes and type changes, including nested objects and arrays. It has **no runtime dependencies** and does not fetch, store or transmit your payloads.

> **Release status:** `0.1.0` is prepared for public npm distribution but **not yet published**. Until publication is confirmed in [Issue #27](https://github.com/codelovingcat/payload-watch/issues/27), install a local archive as described below. The API is pre-1.0 and may change.

## Requirements and compatibility

| Environment | Support |
| --- | --- |
| Node.js application | Node.js **22.12+**, using ESM `import` |
| JavaScript | Compiled JavaScript is included; TypeScript is not required at runtime |
| TypeScript | `.d.ts` declarations are included; no separate `@types/payload-watch` package |
| CI coverage | Full suite on Linux Node.js 22/24; CLI smoke tests on Windows Node.js 22 |
| CommonJS or browser | No dedicated CommonJS build or tested browser runtime; Bundler type resolution alone is tested |

Use the public package root, `payload-watch`, rather than internal `dist/` subpaths. An installed package is already compiled: consuming applications do not run this repository's build or install its development dependencies.

## Installation

### Use the candidate now

Build an installable archive from a checkout:

```bash
git clone https://github.com/codelovingcat/payload-watch.git
cd payload-watch
npm ci
npm pack
```

`npm pack` runs the build automatically and creates `payload-watch-0.1.0.tgz`. In **your application's directory**, install that file, substituting its actual absolute path:

```bash
npm install /absolute/path/to/payload-watch-0.1.0.tgz
```

### After the first npm publication

Once the registry version exists, applications can install it directly:

```bash
npm install payload-watch@0.1.0
```

The registry command is not available for this version until publication completes. The local archive provides the same public imports today.

## JavaScript quick start

Save this as `example.mjs` in the application that installed the package, then run `node example.mjs`. Alternatively use `.js` files with `"type": "module"` in the application's `package.json`.

<!-- example:javascript -->

```js
import { comparePayloads, formatComparisonReport } from "payload-watch";

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
```

Output:

<!-- example:output -->

```text
3 changes detected:
1. Added value at /customer/fullName (current type: string)
2. Removed value at /customer/name (previous type: string)
3. Type changed at /id (number → string)
```

`report.changes` is the structured array for application logic; an empty array means no observed differences. Each entry has `kind` and `path`, with the relevant `previousType` and/or `currentType`. All data above is fictional.

## TypeScript quick start

In your application, add `"type": "module"` to `package.json` and install TypeScript tooling if needed:

```bash
npm install --save-dev typescript @types/node
```

A minimal `tsconfig.json`:

<!-- example:tsconfig -->

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist"
  }
}
```

Save this as `example.ts`, compile with `npx tsc -p tsconfig.json`, then run `node dist/example.js`:

<!-- example:typescript -->

```ts
import { comparePayloads, formatComparisonReport } from "payload-watch";
import type { ComparisonReport, JsonValue } from "payload-watch";

const baseline: JsonValue = { id: 482, status: "ready" };
const current: JsonValue = { id: "482", status: "ready" };
const report: ComparisonReport = comparePayloads(baseline, current);

if (report.changes.length > 0) {
  console.log(formatComparisonReport(report));
}
```

Both quick starts are compiled or executed against an independently installed archive by `npm run check:consumer`. See [Package Entry Points](docs/package-entrypoints.md) for supported resolution modes.

## Options and input errors

`comparePayloads(previous, current, options?)` accepts parsed JSON-compatible values, not serialized JSON text. If you have response text, call `JSON.parse` first. A string is itself a valid JSON value and is compared as a string.

| Option | Default | Effect |
| --- | --- | --- |
| `comparePayloads`: `includeValues` | `false` | Attach detached before/after values to changed records |
| `comparePayloads`: `ignorePaths` | `[]` | Omit exact RFC 6901 paths and their descendants; no wildcards |
| `formatComparisonReport`: `includeValues` | `false` | Show values already included in the report |

```js
const report = comparePayloads(previousPayload, currentPayload, {
  ignorePaths: ["/metadata/requestId"],
  includeValues: true,
});
const textWithValues = formatComparisonReport(report, { includeValues: true });
```

Showing values requires **both** opt-ins. Treat such reports as sensitive. Paths can expose property names even when values are omitted. Reports and inputs are not logged automatically; the examples explicitly choose to print summaries.

Unsupported runtime inputs throw `InvalidJsonInputError` with `input` (`previous` or `current`), `path` and `reason`:

```js
import { comparePayloads, InvalidJsonInputError } from "payload-watch";

try {
  comparePayloads({ amount: Number.NaN }, { amount: 10 });
} catch (error) {
  if (error instanceof InvalidJsonInputError) {
    console.error(error.message); // identifies input/path/reason, not payload values
  } else {
    throw error;
  }
}
```

See [JSON Input Contract](docs/json-input-contract.md), [Ignore Paths](docs/ignore-paths.md) and [Privacy](docs/privacy-and-data-handling.md).

## Local-file CLI

After installing the archive (or, after publication, the registry package), compare two UTF-8 JSON files from your application:

```bash
npx --no-install payload-watch compare previous.json current.json
npx --no-install payload-watch compare previous.json current.json --format json --fail-on-change
```

| Exit code | Meaning |
| --- | --- |
| `0` | Successful comparison; differences are allowed unless `--fail-on-change` is set |
| `1` | Differences found with `--fail-on-change` |
| `2` | Invalid arguments, unreadable file, invalid UTF-8/JSON or unsupported input |

A single leading UTF-8 BOM is accepted; malformed UTF-8 is rejected. The CLI reads local files. The core API does not read files or make network requests. See [CLI Usage](docs/cli.md) for the complete syntax.

## Comparison rules and limits

- Change kinds: `added`, `removed`, `value-changed`, `type-changed`.
- Paths are JSON Pointers: root is `""`; a key's `~` becomes `~0` and `/` becomes `~1`.
- Arrays compare by **index**, without identity matching or move detection.
- Missing properties differ from explicit `null`. Object key order does not affect equality.
- Inputs must be JSON-compatible: no `undefined`, `BigInt`, functions, `Date`, sparse arrays, non-finite numbers or cycles. See the full input contract for object/accessor restrictions.
- Maximum depth is **512**, with root depth 0 and one level per property/element. Deeper input throws `InvalidJsonInputError`, including in ignored subtrees.
- Inputs are not mutated. Included object/array values are detached snapshots.
- A difference does not by itself prove an API change is breaking. There is no schema interpretation, live monitoring, automatic snapshot collection or JSON Patch output.

The implementation is suitable for the documented Node.js use cases; validate your own integration and payload sizes. Pre-1.0 is not a promise of a permanently stable API. See [Comparison Semantics](docs/comparison-semantics.md), [Array Policy](docs/array-comparison.md), [Impact Policy](docs/impact-classification-policy.md) and [Performance](docs/performance-benchmark.md).

## Documentation and development

- [Public API Reference](docs/api-reference.md): all functions, types, errors and troubleshooting.
- [Report Format](docs/report-format.md) and [Change Model](docs/change-model.md).
- [Clean Consumer Installation](docs/consumer-installation.md): actual tarball runtime and type checks.
- [Release Notes](docs/release-notes-0.1.0.md), [Changelog](CHANGELOG.md) and [Versioning Policy](docs/versioning-policy.md).
- [Publishing Guide](docs/publishing.md) and [First Release Checklist](docs/first-release-checklist.md): npm account setup, validation, publication and verification.
- [Synthetic fixtures and runnable examples](https://github.com/codelovingcat/payload-watch/tree/main/examples).
- [Historical MVP Scope](docs/mvp-scope.md), [Post-MVP Review](docs/post-mvp-review.md) and [GitHub Issues](https://github.com/codelovingcat/payload-watch/issues).

From a checkout:

```bash
npm ci
npm run release:verify
```

This performs a clean build, type checks, unit/CLI/preflight tests, package/consumer checks, documented examples and release metadata validation. It does **not** publish. `npm run test:watch` and `npm run benchmark` are available for development. See [Development Workflow](docs/development-workflow.md).

TypeScript source is compiled to JavaScript and declarations for npm; there is no separate TypeScript registry. `prepack` builds the archive, and `prepublishOnly` runs verification before a manual directory-based `npm publish`. CI does not publish on merge. npm account access and the actual registry upload remain to be completed under [Issue #27](https://github.com/codelovingcat/payload-watch/issues/27).

## Contributing and license

Read [Contributing](https://github.com/codelovingcat/payload-watch/blob/main/CONTRIBUTING.md) and the [Code of Conduct](https://github.com/codelovingcat/payload-watch/blob/main/CODE_OF_CONDUCT.md). Report problems with synthetic inputs rather than customer data.

[MIT License](LICENSE), Copyright © 2026 codelovingcat.
