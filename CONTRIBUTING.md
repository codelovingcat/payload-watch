# Contributing to PayloadWatch

Thank you for helping make JSON API changes easier to understand. Contributions should stay focused on the agreed [MVP scope](docs/mvp-scope.md), stable comparison semantics, privacy-safe reports, and clear documentation.

## License status before contributing code

The repository currently has **no chosen software license**. Being public on GitHub does not by itself grant general permission to reuse or redistribute the project. Please raise issues and share reproducible ideas, but **do not submit a new code contribution for integration while license and contribution terms are unresolved**. Maintainers should not merge externally authored code until rights and terms are documented and agreed. Review [the licensing decision guide](docs/licensing-decision.md) and [Issue #23](https://github.com/codelovingcat/payload-watch/issues/23).

## Before opening an issue

Search existing issues and open PRs before reporting a problem or proposing a new feature. For a bug, describe the expected versus observed result, the Node.js version, and a **minimal synthetic JSON input** that reproduces it. Include the JSON Pointer path or change kind if relevant. Do not upload real customer payloads, credentials, access tokens, API keys, or private logs. For vulnerability reports, avoid public proof-of-concept disclosures containing secrets; use a private maintainer/security channel if one is made available or GitHub's reporting controls, and never paste sensitive data into an issue.

For a feature idea, describe the real use case, why the current API is insufficient, alternatives considered, and whether it fits the current milestone. Discuss design changes in an issue before doing substantial work.

## Local development

After a maintainer explicitly authorizes code contributions under a selected license, clone the repository and use a separate branch for one issue. Node.js **22.12.0 or newer** is required. From a fresh checkout run:

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run check:package
```

The lockfile is committed; prefer `npm ci` for reproducible installs. `npm run check:package` requires a successful build and verifies the package archive, an independent ESM import, and TypeScript type resolution. The optional `npm run benchmark` command produces descriptive performance data rather than a timing-based pass/fail result. Avoid adding unstable wall-clock thresholds to the unit tests.

## Pull requests

Keep PRs scoped to a single issue and target `main`. Explain the problem, the solution, possible behavior changes, test evidence, and any remaining limitations. Add or update regression tests for behavior changes and update the relevant documentation. Use `Closes #123` only when the PR fully resolves that issue; otherwise use `Refs #123`. Do not claim commands passed unless they actually ran. Maintainers review and merge PRs; authors should not assume an opened PR will be accepted.

Follow existing ESM/TypeScript conventions, deterministic JSON Pointer behavior, and the default policy of omitting payload values. Never introduce logging, networking, or storage of customer payloads as an incidental change. All contributions must be original or included with compatible rights and attribution; third-party code must be reviewed for licensing and security.

## Working together

We want constructive, respectful technical discussion. Review the [Code of Conduct](CODE_OF_CONDUCT.md): focus on code and ideas, treat contributors fairly, and avoid harassment, personal attacks, discrimination, or sharing private information. Maintainers may close off-topic discussions or restrict abusive participation. This contributor guide is not itself a software license or a contributor license agreement.
