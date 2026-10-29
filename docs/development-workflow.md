# PayloadWatch Development Workflow

Node.js 22.12+ and npm are required. A tracked version-3 `package-lock.json` makes `npm ci` reproducible. The `CI` workflow tests Node.js 22 and 24 on PRs and pushes to `main`.

## Validate from a clean checkout

```bash
git clone https://github.com/codelovingcat/payload-watch.git
cd payload-watch
npm ci
npm run build
npm run typecheck
npm test
npm run check:package
npm run check:consumer
node examples/api-reference.mjs
```

Do not use `npm install` to mask a stale lockfile. If the manifest and lockfile differ, update them together in a reviewed commit. `npm run test:watch` is available for development, and `npm run benchmark` produces descriptive performance measurements rather than CI thresholds.

## API contract

The ESM public root exports `comparePayloads`, `formatComparisonReport` and `InvalidJsonInputError`. The build writes `dist/index.js` and `dist/index.d.ts`; a consumer installing the local archive imports from `payload-watch`. The core engine compares in-memory JSON values only, uses stable RFC 6901 JSON Pointer paths and positional array comparisons, and distinguishes missing keys from explicit null.

Invalid runtime values throw path-aware `InvalidJsonInputError` without serializing payload contents. Before/after values are omitted by default and require two opt-ins to appear in formatted text. See [API Reference](api-reference.md), [Input Contract](json-input-contract.md) and [Privacy](privacy-and-data-handling.md).

## Distribution checks

`npm pack --dry-run --json` inspects the archive without publishing. `npm run check:package` verifies the archive, while `npm run check:consumer` installs a real tarball in a temporary, isolated Node.js/TypeScript project and tests its public imports. These checks have been exercised in CI.

The package remains `private: true` at version `0.0.0`; an npm release is **not** authorized here. After any license/CLI PR merges, recheck the actual packed allowlist, TypeScript declarations, permissions and local consumer behavior. See [Release Readiness](release-readiness.md) and [Issue #27](https://github.com/codelovingcat/payload-watch/issues/27).
