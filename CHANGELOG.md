# Changelog

Notable user-facing changes are recorded in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style using [Semantic Versioning](https://semver.org/).

## [Unreleased]

First candidate **0.1.0** is prepared, but **has not been published to npm**. Package metadata uses version `0.1.0` while `private: true` remains enabled. Date the release entry and create a tag only after explicit publication approval.

### Added

- ESM-only Node.js JSON comparison library with synchronous `comparePayloads`, deterministic RFC 6901 paths and typed `ComparisonReport` results.
- Added, removed, primitive value-changed and JSON type-changed records; nested objects and positional arrays; missing fields distinguished from explicit `null`.
- Runtime validation via `InvalidJsonInputError`, with path-aware diagnostics that do not echo payload values.
- Human-readable `formatComparisonReport`, value-free output by default, and separate opt-in flags to include before/after values.
- Optional exact `ignorePaths` JSON Pointer rules, with subtree omission and malformed-rule checks.
- Optional `payload-watch compare` CLI with text/JSON output, `--fail-on-change`, and exit codes `0` (valid), `1` (differences with flag), `2` (error).
- Generated TypeScript declarations, API documentation, synthetic examples, MIT license and contribution guidelines.
- Unit, regression, CLI, npm archive and clean-consumer validation on Node.js 22 and 24.

### Fixed

- Escape control characters and ambiguous literal backslashes in human-readable JSON Pointer paths to prevent injected terminal output. Structured report paths and JSON CLI output remain unchanged.

### Changed

- Make CLI test fixtures and missing-file paths portable across operating systems, and add a Windows Node.js 22 CLI smoke job covering text/JSON reports and exit codes.

### Known limitations

- Pre-1.0 API and output contracts are evolving; Node.js 22.12+ and ESM are required. No CommonJS or browser runtime guarantee.
- Arrays compare by index only, without move detection, identity-aware matching, schema compatibility verdicts or API snapshot capture.
- `ignorePaths` can hide relevant changes; CLI fail-on-change means *any observed difference*, not a breaking-change classification.
- The package does not fetch APIs, automatically redact JSON Pointer names, or determine application-specific impact.

**Release gate:** npm name and publishing rights remain unverified; no npm tag, GitHub Release or npm publication has happened.
