# First npm release — 0.1.0

**Tracking:** [Issue #27](https://github.com/codelovingcat/payload-watch/issues/27). **Publication evidence:** the issue records the exact commit, authenticated upload and registry verification. This document is the release procedure, not a registry-status assertion.

The first release includes the synchronous ESM comparison library, generated TypeScript declarations, runtime validation, structured/readable reports, exact `ignorePaths` and the local-file CLI. Node.js 22.12+ is required. Arrays are positional; no live monitoring or automatic breaking-change classification is included.

## Repository preparation

- [x] MIT license, package metadata, version 0.1.0 and lockfile are present.
- [x] Runtime behavior, privacy defaults and limitations are documented.
- [x] README includes installed-package JavaScript/TypeScript examples and CLI usage.
- [x] Packed archive checks cover ESM imports, NodeNext/Bundler types, embedded source maps and README examples.
- [x] `private: false`, explicit public npm registry/access, clean `prepack` build and `prepublishOnly` validation are configured.
- [x] CI validates Linux Node.js 22/24 and Windows Node.js 22 CLI without publishing.
- [x] A concrete [Publishing Guide](publishing.md) describes account setup, final upload and registry verification.

## Final publication steps

- [ ] Confirm the exact final release commit has passing CI and `npm run release:verify`.
- [ ] Authenticate the intended npm account and verify package name/rights. Registry 404 during preparation is not a reservation.
- [x] Prepare README installation instructions and the 2026-10-31 changelog entry for 0.1.0. Review the exact tarball, metadata and license before uploading.
- [ ] Run a directory-based `npm publish --dry-run`, then the authorized actual publication.
- [ ] Install the registry version in a fresh project and verify JavaScript, TypeScript and CLI usage.
- [ ] Record npm URL, source commit, integrity, tag `v0.1.0` and GitHub Release in Issue #27; close it after completion.

## Non-publishing verification

```bash
npm ci
npm run release:verify
npm pack --dry-run --json
```

`release:preflight` now succeeds for correct public-release metadata. It does not check npm authentication, reserve a name or upload a package. `check:release-candidate` verifies local package contracts without requiring a private-package blocker. A passing check or merged PR does not mean the version exists on npm.
