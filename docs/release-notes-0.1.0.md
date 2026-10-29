# PayloadWatch 0.1.0 — first-release candidate notes

**Status: NOT PUBLISHED.** This describes a proposed first public npm release, not an existing registry version. `package.json` and `package-lock.json` use `0.1.0`, but **`private: true` remains enabled**. No publish, public tag or GitHub Release has occurred.

## Candidate functionality

- Compare two caller-provided JSON values using `comparePayloads`; report added, removed, value-changed and type-changed locations using RFC 6901 JSON Pointers.
- Deterministic nested object traversal, arrays by index, and distinction between missing fields and explicit `null`.
- ESM root exports and generated TypeScript declarations; Node.js 22.12+ minimum, with Node.js 22 and 24 CI validation.
- Path-aware `InvalidJsonInputError` on invalid inputs; reports omit before/after values by default.
- Human-readable `formatComparisonReport`, with deliberate value opt-in both during comparison and formatting.
- Optional exact `ignorePaths` rules for suppressing noisy locations and descendants, including rule validation.
- Optional local JSON CLI `payload-watch compare previous.json current.json` with text/JSON output and `--fail-on-change` (exit 0 valid, 1 changes with flag, 2 error).
- MIT license, CHANGELOG, documentation, synthetic examples, and offline consumer package tests.

## Known limitations

- The API is pre-1.0 and may evolve across 0.x versions; this is not a 1.0 stability promise.
- ESM-only; no CommonJS import entrypoint or tested browser runtime build.
- Positional arrays: no stable-ID matching, move detection or JSON patch output.
- No automated breaking-change verdict; CLI exit 1 indicates any observed difference only when explicitly requested.
- Core library does not fetch APIs, persist response snapshots, handle credentials or monitor network services.
- Ignore rules can conceal significant drift; default value omission does not automatically redact JSON Pointer property names.

## Candidate verification (never publishes)

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run test:cli
npm run check:package
npm run check:consumer
npm run check:release-candidate
node scripts/verify-post-mvp-scenarios.mjs
npm pack --dry-run --json
```

Actual public distribution requires a separate maintainer approval of the npm package name, scope, permissions, artifact, privacy, and 2FA/authentication. The existing `release:preflight` intentionally remains blocked while `private: true`. See [First Release Checklist](first-release-checklist.md).

To test an actual local archive, run `npm pack --ignore-scripts` and install the resulting `.tgz` file into a separate project. That is not the same as downloading a published version using npm.

## Record only after successful, explicitly authorized publication

- Actual npm package URL, published version and exact publication date
- Confirmed Git tag `v0.1.0`, GitHub release page and source commit
- Independent install verification of the publicly published tarball
