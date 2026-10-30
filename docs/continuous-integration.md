# Continuous Integration

**Tracking issue:** [#21 — Run build, tests, and type checks on GitHub Actions](https://github.com/codelovingcat/payload-watch/issues/21)

The [CI workflow](https://github.com/codelovingcat/payload-watch/blob/main/.github/workflows/ci.yml) verifies PayloadWatch from a clean GitHub-hosted checkout. It runs when a pull request targets `main`, when code is pushed to `main`, or when a maintainer starts it manually with `workflow_dispatch`.

## Supported Node.js versions in CI

The main job matrix uses Ubuntu-hosted runners with **Node.js 22** and **Node.js 24**. A separate **Windows (`windows-latest`, Node.js 22)** smoke job installs the locked dependencies, builds, type-checks, and runs the full CLI integration suite (`npm run test:cli`). The package declares `engines.node >=22.12.0`; these jobs sample supported major versions and one Windows configuration rather than every patch version, filesystem, or platform.

## What each job checks

The workflow runs these independent steps, in order:

```bash
npm ci
npm run build
npm run typecheck
npm test
```

`npm ci` uses the tracked `package-lock.json` and refuses an out-of-sync manifest/lockfile rather than updating dependencies. The build compiles the TypeScript sources, the type-check step validates them without emitting files, and `npm test` runs the Vitest suite, including large-payload correctness tests. Failure of any required command fails that Node.js job and reports it on the PR.

Check the pull request's **Checks** tab or the repository's **Actions** tab for the `CI` workflow and both Node.js jobs. For a workflow error, inspect the first failing step's log, reproduce the same command locally with a compatible Node.js version, and commit a fix to the PR branch. Do not mark this workflow as validated solely because its YAML is present: confirm both Linux jobs and the Windows CLI smoke job pass on GitHub-hosted runners.

## Windows CLI coverage

The Windows job specifically exercises local JSON-file comparison in text and JSON modes, valid no-change comparisons, exit-code behavior for changes/errors, and temporary file paths containing spaces and non-ASCII characters. CLI integration tests now convert file URLs with Node.js `fileURLToPath()`, not a raw URL `.pathname`, and create unique temporary paths for missing-file cases.

Windows smoke coverage confirms those CLI workflows on a GitHub-hosted Windows runner; it does **not** claim that the full Linux packaging and consumer-installation suite has been exercised on Windows. All temporary fixtures are synthetic and removed in `finally` blocks. Existing Linux Node.js 22/24 jobs remain unchanged.

## Data, security, and benchmark scope

- The workflow uses read-only repository permissions (`contents: read`) and disables persisted checkout credentials. No application secrets, production API credentials, or deploy tokens are needed.
- The project tests run against synthetic or in-memory JSON data, not a live third-party API. The workflow installs npm dependencies from the registry as part of `npm ci`; it does not fetch production payloads.
- The `npm run benchmark` command is deliberately **not** a CI gate. Its wall-clock and memory results vary by hardware, garbage collection, and runner load. For reproducible benchmark comparisons, follow [Performance Benchmark](performance-benchmark.md) on a specified environment.
- This workflow does not publish a package or deploy any service. Any release workflow would require separate security review and configuration.

## Local equivalent

From a fresh checkout with Node.js 22.12+ and npm, run the four commands above. Make sure you are on the intended branch. In particular, do not substitute `npm install` for `npm ci`, because that can mask a stale lockfile.
