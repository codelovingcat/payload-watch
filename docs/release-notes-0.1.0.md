# PayloadWatch 0.1.0 — release notes

**Release version:** `0.1.0` · **Date:** 2026-10-31 · **License:** MIT.

```bash
npm install payload-watch@0.1.0
```

Use `import { comparePayloads, formatComparisonReport } from "payload-watch"` in a Node.js 22.12+ ESM application. TypeScript declarations and the CLI are included. See the [README](../README.md) for complete runnable examples.

## Included functionality

- Compare two caller-provided JSON values using `comparePayloads`; report added, removed, value-changed and type-changed locations using RFC 6901 JSON Pointers.
- Deterministic nested object traversal, arrays by index, and distinction between missing fields and explicit `null`.
- ESM root exports and generated TypeScript declarations; Node.js 22.12+ minimum. CI validates the full suite on Linux Node.js 22/24 and targeted CLI workflows on Windows Node.js 22.
- Path-aware `InvalidJsonInputError` on invalid inputs; reports omit before/after values by default.
- Defined nesting limit: root depth 0, maximum depth 512. Excess depth raises `InvalidJsonInputError` with the input/path; the CLI returns exit 2. Object/array boundaries and included-value formatting are regression-tested.
- Human-readable `formatComparisonReport`, with deliberate value opt-in both during comparison and formatting. Text-only JSON Pointer display escaping prevents control characters from injecting terminal/log output; structured pointer values remain unchanged.
- Optional exact `ignorePaths` rules for suppressing noisy locations and descendants, including rule validation.
- Optional local JSON CLI `payload-watch compare previous.json current.json` with text/JSON output and `--fail-on-change` (exit 0 valid, 1 changes with flag, 2 error). CI covers Windows file paths with spaces and non-ASCII characters.
- Strict CLI UTF-8 decoding with single-leading-BOM support; safe display escaping for values, paths and errors.
- Embedded TypeScript source maps, tested README quick starts and automatic build/verification hooks before packing/publishing.
- MIT license, bundled CHANGELOG, documentation, synthetic examples, and offline consumer package tests.

## Known limitations

- The API is pre-1.0 and may evolve across 0.x versions; this is not a 1.0 stability promise.
- ESM-only; no CommonJS import entrypoint or tested browser runtime build.
- Positional arrays: no stable-ID matching, move detection or JSON patch output.
- No automated breaking-change verdict; CLI exit 1 indicates any observed difference only when explicitly requested.
- Core library does not fetch APIs, persist response snapshots, handle credentials or monitor network services.
- Ignore rules can conceal significant drift; default value omission does not automatically redact JSON Pointer property names.

## Source verification (never publishes)

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

The metadata-only `release:preflight` checks package configuration; it does not authenticate or publish. For the release procedure see [Publishing Guide](publishing.md).

## Publication record

The npm package page is [payload-watch](https://www.npmjs.com/package/payload-watch). The exact source commit, registry integrity, independently installed-package verification, Git tag and GitHub Release are recorded in [Issue #27](https://github.com/codelovingcat/payload-watch/issues/27) after publication succeeds.
