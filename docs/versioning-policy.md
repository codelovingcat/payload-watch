# Versioning and release policy

**Tracking:** [Issue #26](https://github.com/codelovingcat/payload-watch/issues/26). **Current status:** policy adopted for the next release review; this document does not publish a version.

## Release and compatibility contract

- Use [Semantic Versioning 2.0.0](https://semver.org/) for published tags and npm versions. Before a first intentional stable release, versions are `0.MINOR.PATCH`; the public API is evolving and **pre-1.0 versions do not promise long-term compatibility**.
- The first release version is `0.1.0`, with public npm access. Changing metadata does not itself upload a release; publication and registry verification are tracked in Issue #27.
- Once an explicitly declared stable `1.0.0` is released, increment **MAJOR** for incompatible public API changes, **MINOR** for backward-compatible functionality and **PATCH** for backward-compatible bug fixes.
- Prior to 1.0, increment **MINOR** when making intentional changes to the library contract, including potentially breaking public signatures, exports, output semantics and supported Node.js minimum. Increment **PATCH** for compatible fixes and docs-only hotfix releases. Clearly call out incompatibilities in notes even for `0.x`.
- Prereleases may use semver prerelease identifiers (`0.1.0-rc.1`). Published release tags use `v<version>` (for example `v0.1.0`), and each tag must match npm's `package.json` version and the associated changelog entry.

## What belongs in the changelog

Use a hand-curated [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) document with **Unreleased** and dated version headings. Under each, use only relevant headings from **Added**, **Changed**, **Deprecated**, **Removed**, **Fixed** and **Security**. Write user-facing effects, not a list of merge commits.

Every change to exports, behavior, output format, input validation, error contract, CLI flags/exit codes, packaging, type declarations, supported Node.js minimum and runtime dependencies should be represented under the relevant version. Security fixes should not publish exploit details or sensitive payloads. Purely internal refactoring or dev dependency bumps without user impact can remain in PR history.

## Lightweight maintainer workflow

1. For each change to a public contract, update the **Unreleased** section in `CHANGELOG.md` in the same PR. Link the issue and flag any migration step.
2. Before a proposed release, review the outstanding issues and PRs, CI for supported Node.js versions, the packed archive, license, generated declarations, and realistic consumer checks.
3. Select the intended version based on the actual compatibility changes, then move the relevant Unreleased items to a `## [x.y.z] - YYYY-MM-DD` heading. Do not invent a release date before publishing.
4. The authorized maintainer updates the version, lockfile, changelog and release notes together. Publish and tag **only after separate explicit approval**, verifying npm package identity and permissions first.
5. Keep one primary release note entry per user-visible behavior. No automated changelog generation, release bot, `npm publish` CI job, or implicit publish-on-merge is enabled.

## Compatibility examples

| Change | Pre-1.0 | After 1.0 |
| --- | --- | --- |
| New optional comparison option | Minor (if feature) | Minor |
| Changed `PayloadChange` path meaning | Minor, with breaking note | Major |
| Added optional CLI output mode | Minor | Minor |
| Dropping support for a Node.js major version | Minor, with migration note | Major |
| Correctness fix without interface break | Patch | Patch |
| Docs-only change | Usually Unreleased; no release required | Same |

**Compatibility boundary:** current package exports are ESM-only, Node.js 22.12+ and no browser/runtime CommonJS guarantee. Passing a CI matrix does not itself promise compatibility across untested environments.
