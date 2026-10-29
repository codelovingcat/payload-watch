# First npm release: explicit final approval

**Issue:** [#27](https://github.com/codelovingcat/payload-watch/issues/27). This work **prepares** a release; it does not authorize publication.

The candidate first release is **0.1.0**, proposed only. The package stays `0.0.0` and `private: true` until a separately reviewed release decision. The v0.1 core covers ESM JSON comparisons, TypeScript declarations and safe default reports; optional post-MVP CLI/ignore features must be explicitly included or excluded during scope review.

## Owner checklist

- [ ] Confirm the MVP comparison behavior, validation, examples, README and actual CI on Node.js 22/24.
- [ ] Merge [MIT license PR #52](https://github.com/codelovingcat/payload-watch/pull/52) and verify `LICENSE` is in the packed archive.
- [ ] Reconcile legacy documentation in [PR #45](https://github.com/codelovingcat/payload-watch/pull/45) so it reflects the present lockfile, package exports and tests.
- [ ] Merge the semantic-versioning policy and curated CHANGELOG in [Issue #26](https://github.com/codelovingcat/payload-watch/issues/26).
- [ ] Run package and isolated consumer checks using the exact archive to be released.
- [ ] Check that no production API payloads, secrets, keys or private files are packaged.
- [ ] Deliberately select whether CLI and ignorePaths (post-MVP) enter the first version.
- [ ] Confirm the npm name is available and controlled by the authorized account. Run `npm view payload-watch version`, `npm whoami` and follow npm's current registration rules; a 404 does **not** guarantee the name can be claimed.
- [ ] Review required 2FA/trusted publishing, organization scopes, credentials, version and changelog. Never commit npm tokens.
- [ ] Obtain explicit release approval. In a dedicated release PR change `private: true`, set `0.1.0` (or an approved version), update the lockfile and release notes together.
- [ ] Publish only by an authorized maintainer after independent review; verify npm artifact, consumer install and GitHub release/tag.

## Safe local checks (no publishing)

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run check:package
npm run check:consumer
npm run release:preflight
```

`release:preflight` is deliberately **blocking** until static metadata is ready: the `private` flag, placeholder version and missing prerequisites produce exit code 1. This local check makes **no** network requests or registry changes. Even exit 0 does not verify npm ownership, CI, secret scans or human approval. CI runs **unit tests** of the preflight checker, not the intentionally blocking command.

**There is no automatic `npm publish`, version bump, tag or deployment in this PR.** Publication remains an explicit future action.
