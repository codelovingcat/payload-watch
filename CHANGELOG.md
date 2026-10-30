# Changelog

Notable user-facing changes are recorded in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style using [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-31

First release: JSON payload comparison for Node.js applications, TypeScript declarations and the local-file CLI.

### Added

- Application installation and JavaScript/TypeScript quick starts verified against the installed archive; bundled changelog and a step-by-step npm publishing guide.
- Clean builds before packing and complete local verification before manual publication.
- ESM-only Node.js JSON comparison library with synchronous `comparePayloads`, deterministic RFC 6901 paths and typed `ComparisonReport` results.
- Added, removed, primitive value-changed and JSON type-changed records; nested objects and positional arrays; missing fields distinguished from explicit `null`.
- Runtime validation via `InvalidJsonInputError`, with path-aware diagnostics that do not echo payload values.
- Human-readable `formatComparisonReport`, value-free output by default, and separate opt-in flags to include before/after values.
- Optional exact `ignorePaths` JSON Pointer rules, with subtree omission and malformed-rule checks.
- Optional `payload-watch compare` CLI with text/JSON output, `--fail-on-change`, and exit codes `0` (valid), `1` (differences with flag), `2` (error).
- Generated TypeScript declarations, API documentation, synthetic examples, MIT license and contribution guidelines.
- Unit, regression, CLI, npm archive and clean-consumer validation on Node.js 22 and 24.

### Fixed

- Reject malformed UTF-8 CLI files, accept one leading UTF-8 BOM, and preserve BOM characters inside JSON strings.
- Escape display controls in opt-in nested values, validation errors and CLI argument errors while preserving structured data.
- Embed original TypeScript sources in packaged source maps for debugging installed packages.
- Escape control characters and ambiguous literal backslashes in human-readable JSON Pointer paths to prevent injected terminal output. Structured report paths and JSON CLI output remain unchanged.

### Changed

- Define a maximum JSON nesting depth of 512 (root depth 0), including ignored subtrees. Excessive depth now throws `InvalidJsonInputError` before recursive comparison instead of reaching the runtime call-stack limit; the CLI reports exit 2.
- Make CLI test fixtures and missing-file paths portable across operating systems, and add a Windows Node.js 22 CLI smoke job covering text/JSON reports and exit codes.

### Known limitations

- Pre-1.0 API and output contracts are evolving; Node.js 22.12+ and ESM are required. No CommonJS or browser runtime guarantee.
- Arrays compare by index only, without move detection, identity-aware matching, schema compatibility verdicts or API snapshot capture.
- `ignorePaths` can hide relevant changes; CLI fail-on-change means *any observed difference*, not a breaking-change classification.
- The package does not fetch APIs, automatically redact JSON Pointer names, or determine application-specific impact.
