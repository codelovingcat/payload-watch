# Clean consumer installation — npm archive verification

**Tracking issue:** [#25 — Test packed artifact from a clean consumer project](https://github.com/codelovingcat/payload-watch/issues/25)

## Goal and scope

Validate the **actual .tgz archive** npm installs, separate from the repository's `src/` files. This is a release-readiness test, not an npm publication. The package remains `private: true` and has version `0.0.0` until release decisions are completed.

## From a fresh checkout

Use Node.js 22.12+ and npm. Run:

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run check:package
npm run check:consumer
```

The GitHub Actions CI matrix runs these checks on Node.js 22 and 24. The final command is self-contained after `npm ci` and `npm run build`. It creates and cleans temporary directories in your OS temp folder.

## What the consumer check does

1. Runs `npm pack --dry-run --json` and creates a real archive using `npm pack --json --pack-destination` (both with `--ignore-scripts`). It confirms that the file manifests match, required JavaScript/declaration files and README exist, and no unexpected development files are shipped.
2. If the package declares a software license, verifies that `LICENSE` is packed and appears in the installed package. This intentionally works before or after the separate MIT license PR merges.
3. Installs the archive **offline** via `npm install` in a fresh temporary directory with its **own `package.json` and `node_modules`**, without downloading dependencies, running lifecycle scripts or publishing.
4. Uses `import { ... } from "payload-watch"` in a standalone `.mjs` program to test actual ESM resolution, typed differences, privacy flags, primitive/root behavior, and invalid input errors. Confirms the module resolves from the **consumer's installed** `node_modules/payload-watch/dist/index.js`.
5. Compiles an independent `.mts` file with strict TypeScript **NodeNext** configuration, then runs its emitted `.mjs` using Node.js. Compiles another consumer `.ts` in strict **Bundler** resolution mode with `noEmit`. Both resolve types from the installed package, not `src/`.
6. Removes the temporary project and archive, even if a check fails.

The TypeScript **compiler executable** comes from the repo's already-installed development dependencies, but the consumer's module and type import resolution uses its isolated `node_modules`. There are no production API secrets or external service calls.

## Manual archive inspection

To inspect packaging without publishing:

```bash
npm ci
npm run build
npm pack --dry-run --json
```

For a real tarball, run `npm pack --ignore-scripts` and inspect the generated file name. It can be installed from its file path into a new project using `npm install /absolute/path/to/payload-watch-<version>.tgz`. Do **not** run `npm publish` during these checks.

## Boundaries

- The package is ESM-only; CommonJS, browser bundling/runtime behavior, older Node.js releases, and unpublished features are **not** guaranteed by these checks.
- TypeScript Bundler **module resolution** is checked; no browser build is executed.
- This checks local synthetic payloads and packaging behavior only. Actual third-party API integrations and production performance are outside scope.
- The existing [`check:package`](package-entrypoints.md) continues to enforce the minimal package contract; `check:consumer` adds an independent install, more behavior checks, and a second type-resolution mode.
