# Publishing PayloadWatch to npm

PayloadWatch is a TypeScript-authored **npm package**. npm distributes compiled ESM JavaScript, `.d.ts` declarations, embedded-source maps, the CLI, documentation and the MIT license. Consumers install one package; there is no separate TypeScript registry.

## Current release state

- Name/version: `payload-watch@0.1.0`, public, MIT, Node.js 22.12+ / ESM.
- `private: false` and `publishConfig` select public access and `https://registry.npmjs.org/`. They permit a release; they do not upload it.
- `prepack` performs a clean build. `prepublishOnly` runs `npm run release:verify` before a directory-based publish. Archive checks use `--ignore-scripts` internally to avoid recursive lifecycle execution.
- CI validates pull requests and main; it has no publish step or npm credentials.
- **Not published yet.** During preparation on 2026-10-30, the public registry returned 404 for `payload-watch`; the working environment had no authenticated npm account. A 404 does not reserve the name or prove an account may claim it.

[Issue #27](https://github.com/codelovingcat/payload-watch/issues/27) stays open until publication and registry-consumer verification are recorded.

## 1. Select the source and validate it

Use a reviewed checkout of `main` with passing CI. Inspect `git status --short` and `git rev-parse HEAD`; do not include unrelated local edits in the release.

```bash
git switch main
git pull --ff-only
npm ci
npm run release:verify
npm pack --dry-run --json
```

`release:verify` checks the build, types, unit/CLI/preflight tests, package contents, an isolated tarball install, README examples, API examples and release metadata. It never publishes. Inspect the archive manifest for the intended version and contents; the consumer check verifies runtime ESM and TypeScript resolution independently of the source tree.

## 2. Authenticate the publishing account

In the maintainer's terminal, log into the intended npm account and confirm its identity:

```bash
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm view payload-watch name version repository maintainers --json --registry=https://registry.npmjs.org/
```

Use npm's browser/2FA prompts. Do not paste passwords, tokens or one-time codes into repository files, issues or chat. A GitHub login does not create an npm login.

If the name exists, verify ownership and the repository identity before proceeding. If it returns 404, attempt publication only with the intended account; npm can still reject a name. If the name cannot be claimed, select an owned scope such as `@YOUR_NPM_USERNAME/payload-watch` in a separate reviewed change, updating metadata, imports, checks and docs together. Do not publish an empty placeholder version to reserve the name.

## 3. Finalize release documentation and upload

On the actual publication day, prepare the final release commit: remove the unpublished-candidate status from README/release notes, move the curated changelog items to a dated `0.1.0` heading, and keep an empty `Unreleased` heading for subsequent work. Keep version `0.1.0` in both manifests. Re-run validation on that exact commit. If publication fails, keep the release status accurate and do not create a successful-release tag.

From the repository root, first inspect a publish dry run:

```bash
npm publish --dry-run --access public --registry=https://registry.npmjs.org/
```

Then the authorized maintainer performs the actual public upload:

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```

This directory-based command runs `prepublishOnly` and `prepack`. Do not use `--ignore-scripts` for the actual publish, or publish an arbitrary `.tgz` expecting repository lifecycle checks to run. Complete any npm authentication prompts. Package name/version pairs cannot be overwritten; inspect an error before deciding whether a retry is appropriate.

## 4. Verify the registry package

After npm reports success:

```bash
npm view payload-watch@0.1.0 version dist.integrity dist.tarball repository --json --registry=https://registry.npmjs.org/
```

In a new directory outside the checkout:

```bash
mkdir payload-watch-registry-smoke
cd payload-watch-registry-smoke
npm init -y
npm install --save-exact payload-watch@0.1.0 --registry=https://registry.npmjs.org/
node --input-type=module -e "import { comparePayloads } from 'payload-watch'; const r = comparePayloads({id:1}, {id:'1'}); if (r.changes.length !== 1 || r.changes[0].kind !== 'type-changed') throw new Error('Unexpected report'); console.log('Registry import passed');"
npx --no-install payload-watch --help
```

Also run the README TypeScript quick start using this registry-installed package. Record the npm URL, source commit, integrity, CI and consumer results in Issue #27. After success, create `v0.1.0` pointing to the published source commit and a GitHub Release using the release notes. Close the issue only when these steps are complete.

Expected package page after publication: https://www.npmjs.com/package/payload-watch.

## Later releases: GitHub Actions trusted publishing

After the first manual release, configure npm trusted publishing for an explicitly chosen GitHub Actions workflow. npm's package settings bind the GitHub owner, repository, workflow filename and optional environment; the workflow requires `id-token: write`. Current npm guidance requires Node.js 22.14+ and npm 11.5.1+ for OIDC publishing. A public GitHub repository publishing a public package this way gets provenance automatically. No trusted-publisher workflow is configured by this preparation change.

Use a separately reviewed release workflow and keep ordinary PR CI free of publishing. Consult the current npm instructions when enabling this; no npm token needs to be committed or placed in GitHub Issues.

## Official references

- [Publishing an unscoped public package](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/)
- [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
- [Lifecycle scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts/)
- [Trusted publishing with OIDC](https://docs.npmjs.com/trusted-publishers/)
