# PayloadWatch Release Readiness

**Issue #10:** development workflow and artifact validation. This is a **living pre-release checklist**, not a claim that an npm package has been published.

| Item | Current evidence | Release gate |
| --- | --- | --- |
| JSON comparison | Core diff engine, stable paths, regression tests and input validation exist | Validate exact final release candidate |
| Dependency installation | Tracked v3 `package-lock.json` and `npm ci` | Keep manifest and lockfile in sync |
| Build and types | ESM `dist/index.js`, generated `dist/index.d.ts`, exports map | Recheck archive after release version bump |
| CI | GitHub Actions for Node.js 22 and 24 | Require passing final candidate checks |
| Local install | `npm run check:consumer` installs archive into an external temp project | Verify the final artifact and supported module modes |
| Security | Default values omitted; synthetic test data | Confirm no real payloads or secrets packed |
| License | MIT `LICENSE` and SPDX metadata are merged; checks require license in the tarball | Confirm attribution in the final release archive |
| Versioning | SemVer policy merged and CHANGELOG curated; private `0.1.0` candidate prepared | Date release notes and create a tag only after publication |
| npm publication | [Issue #27](https://github.com/codelovingcat/payload-watch/issues/27) | Explicit maintainer approval, npm name and rights check |

## Fresh-checkout validation

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run check:package
npm run check:consumer
npm pack --dry-run --json
```

Confirm the tarball contains required metadata, README, generated JavaScript and declaration files, documentation, and any approved LICENSE file. It should not unexpectedly include source-only code, dependencies, development test fixtures, personal data or environment secrets. The optional CLI and `ignorePaths` are included in this **0.1.0 candidate** as evolving pre-1.0 APIs; users should review the documented caveats.

The package is intentionally `private: true` at candidate version `0.1.0` until a deliberate final publication step. This Issue #10 update neither publishes to npm nor authorizes removing that safeguard.
