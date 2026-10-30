# Package entry points and consumer verification

**Tracking issue:** [#22 — Package exports and TypeScript declarations](https://github.com/codelovingcat/payload-watch/issues/22)

## Release contract

PayloadWatch currently targets **ES modules (ESM only)** on Node.js **22.12.0 or newer**, with Node.js 22 and 24 exercised in CI. The first-release public import is the package root: `payload-watch`. The package does **not** expose internal subpaths, and there is no separately tested CommonJS output. Do not assume compatibility with older Node.js versions or other module-resolution systems without testing them.

Package metadata maps the public entry point to `./dist/index.js` for JavaScript and `./dist/index.d.ts` for TypeScript using `main`, `types`, and `exports`. `tsconfig.json` enables `declaration`, so the regular build produces `.d.ts` files for the public entry point and its referenced internal modules. The ESM import surface is the exports from `src/index.ts` only.

JavaScript source maps embed the original TypeScript text in `sourcesContent`
(`sourceMap` and `inlineSources` are enabled). A debugger can display those
sources after installing the tarball even though the `src/` directory itself is
not distributed. This deliberately includes library source text in the maps;
tests, fixtures and environment files remain excluded. `npm run check:consumer`
inspects maps from the actual installed archive and verifies embedded content
against the checkout, alongside its runtime and type-resolution checks.

```js
import { comparePayloads, formatComparisonReport } from "payload-watch";
const result = comparePayloads({ id: 1 }, { id: "1" });
console.log(formatComparisonReport(result));
```

```ts
import { comparePayloads } from "payload-watch";
import type { ComparisonReport, JsonValue } from "payload-watch";
const before: JsonValue = { id: 1 };
const report: ComparisonReport = comparePayloads(before, { id: "1" });
```

## Pack and test the consumer contract

From a clean checkout, with Node.js 22.12+ installed:

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run check:package
```

`npm run check:package` creates a local npm tarball with `npm pack` and inspects the archive file list. It requires `dist/index.js` and `dist/index.d.ts` and rejects files outside the package allowlist (`package.json`, `LICENSE`, `README.md`, `dist/`, `docs/`, `bin/`), plus environment-file names. Then it installs the local tarball **offline** into a temporary, independent consumer directory and verifies a real ESM `import` at runtime and a strict TypeScript NodeNext `.mts` import with the project's installed compiler. Temporary files are removed after the check. No package is published and no real API payloads are used.

The CI workflow runs this after build, type-check and unit tests on both Node.js 22 and 24. Confirm that both GitHub jobs pass on the PR; writing metadata alone does not establish a working artifact.

## Published archive policy and remaining release work

The `files` allowlist deliberately includes generated `dist/` output, documentation, and the optional `bin/` CLI. npm also includes `package.json` and the root MIT `LICENSE`; the package check requires both. Test files, example fixtures, source-only files, environment files and build scripts are not intended to ship. Build output is ignored by Git but included in `npm pack` after compilation.

The package is a **private, unpublished `0.1.0` release candidate**. Both the initial archive check ([Issue #22](https://github.com/codelovingcat/payload-watch/issues/22)) and the fuller clean-consumer compatibility review ([Issue #25](https://github.com/codelovingcat/payload-watch/issues/25)) have been implemented and merged. The optional CLI is included under `bin/`; the library API uses the package root export. The MIT license and versioning policy are also in place. **Remaining gate:** verified npm package-name ownership, maintainer publication approval, and final published-artifact verification ([Issue #27](https://github.com/codelovingcat/payload-watch/issues/27)). Local packaging checks never publish.
