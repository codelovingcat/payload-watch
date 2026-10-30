# License decision: MIT

**Tracking issue:** [#23 — Choose a license and document contribution expectations](https://github.com/codelovingcat/payload-watch/issues/23)  
**Decision:** MIT (SPDX identifier `MIT`), authorized by the repository owner on 2026-10-29.

## Decision and scope

PayloadWatch is intended to be a small, reusable TypeScript/Node.js library that developers can adopt in open-source and commercial projects without reciprocal source-disclosure obligations. The owner authorized selection of an appropriate open-source license; **MIT** was selected for its short and permissive terms and widespread library compatibility.

The binding terms are in the repository's [LICENSE](../LICENSE), with **Copyright (c) 2026 codelovingcat**. The package manifest declares `"license": "MIT"` for SPDX-aware tooling. MIT requires retaining the copyright and license notice in copies or substantial portions, and includes warranty and liability disclaimers.

MIT does **not** include an express patent grant equivalent to Apache-2.0. The alternatives considered were Apache-2.0, GPL-3.0-only, and remaining unlicensed; those were not chosen. This decision does not claim ownership of third-party code or grant permissions beyond the rights held by the contributors.

## Contribution and distribution

- Contributions should be original or legally redistributable under MIT; see [CONTRIBUTING.md](https://github.com/codelovingcat/payload-watch/blob/main/CONTRIBUTING.md).
- A lightweight [Code of Conduct](https://github.com/codelovingcat/payload-watch/blob/main/CODE_OF_CONDUCT.md) applies to project discussions.
- The local npm archive must contain the correct LICENSE file along with compiled JavaScript and TypeScript declarations. `npm run check:package` enforces the archive contract in CI.
- The `0.1.0` candidate is configured for public npm distribution but **not published to npm**. The MIT repository license and the npm release decision are separate.

## Verification

From a clean checkout run `npm ci`, `npm run build`, `npm run typecheck`, `npm test`, then `npm run check:package`. Review the CI job results before merging.

**Status:** License selection recorded. Issue #23 is resolved when this LICENSE/metadata/packaging PR merges successfully.
