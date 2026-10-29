# First npm release — `0.1.0` candidate and final approval gates

**Tracking Issue:** [#27](https://github.com/codelovingcat/payload-watch/issues/27). **Status:** private candidate, **not published**.

## Candidate scope reviewed

The proposed first public version is `0.1.0` and is recorded in both `package.json` and `package-lock.json`. The package remains **`private: true`**. The release candidate includes the documented ESM comparison library, TypeScript declarations, default value-free structured/text reports, runtime validation, opt-in exact `ignorePaths`, and the separate local JSON comparison CLI (`--format text|json`, `--fail-on-change`, exit codes 0/1/2). CLI and ignores are explicit pre-1.0 additions, not 1.0 stability commitments.

**Supported environment:** Node.js 22.12+ with ESM. CI exercises the full suite on Linux Node.js 22/24 and local-file CLI smoke tests on Windows Node.js 22; this does not guarantee every platform/version combination. Arrays are positional; there is no OpenAPI/JSON Schema interpretation, identity-aware array matching, live API calls or automatic API monitoring. See [Release Notes](release-notes-0.1.0.md) and the [API Reference](api-reference.md).

## Evidence and checks

- [x] Core implementation, MIT `LICENSE`, tracked npm lockfile, ESM export map and TypeScript declarations are present.
- [x] CI runs npm ci, build, typecheck, Vitest tests, CLI tests, examples, archive inspection and an offline isolated consumer install on Node.js 22/24.
- [x] Release-scope decision recorded for the current candidate: CLI and `ignorePaths` included, with limitations documented.
- [x] Synthetic test fixtures and default value omission are documented. The packed archive is restricted by the test allowlist; **re-run against final artifact**.
- [ ] This exact candidate commit has successful CI and actual `npm pack`/consumer checks (review the PR Checks tab).
- [ ] npm registry confirms that `payload-watch` is publishable by **your own authenticated npm account**; package-name availability has **not been verified**.
- [ ] Verify npm account login and publication rights. For manual publish use npm's current 2FA requirements; prefer a secure, interactive maintainer session. **Do not put tokens or OTP values in GitHub Issues or this chat.**
- [ ] Review precise tarball contents, npm metadata and license copyright ownership for the public release.
- [ ] Explicit maintainer authorization for **public npm publication** and final version/name/scope.
- [ ] Create a separate final publication change: switch `private` to `false`, update the two package check scripts that currently enforce `private: true`, and make sure CI remains green. Keep `npm publish` out of automatic PR workflows.
- [ ] On publication day, move curated entries from `CHANGELOG.md` Unreleased to dated `0.1.0`; create a corresponding `v0.1.0` tag **only after publication is confirmed**.
- [ ] An authorized maintainer publishes using npm (or a separately approved trusted-publisher workflow), then verifies the registry tarball, installs the published version into a clean project, and records the npm URL, Git tag and GitHub Release.

## Safe validation (no publish)

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run test:cli
npm run check:package
npm run check:consumer
npm run check:release-candidate
npm pack --dry-run --json
npm run release:preflight
```

`release:preflight` **must report a private-package blocker** even when the candidate is otherwise ready. `check:release-candidate` is a separate positive validation of the private 0.1.0 candidate. Neither performs npm publication, registry mutations or credential access.

## Registry and authentication

npm unscoped packages are public when published. The public name `payload-watch` has **not** been independently confirmed as available; a search result or `npm view` 404 alone cannot prove that an account may claim it. The owner must check the actual registry and publish rights. If using trusted publishing later, current npm guidance requires Node.js 22.14+ and npm 11.5.1+, with correct OIDC mapping; no trusted publishing configuration is assumed.

**Do not close Issue #27 solely because this PR merges:** the issue's acceptance criteria include an actual authorized npm publication and recorded install URL.
