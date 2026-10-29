# Contributing to PayloadWatch

Thank you for helping make JSON API changes easier to understand. Contributions should stay focused on the agreed [MVP scope](docs/mvp-scope.md), stable comparison semantics, privacy-safe reports, and clear documentation.

## License and contribution rights

PayloadWatch is distributed under the [MIT License](LICENSE), with copyright attribution to codelovingcat. Read its terms before redistributing. Code contributions are welcome after issue discussion; by submitting a pull request you confirm you have the rights to submit the contribution and agree it can be distributed under the repository's MIT license. Do not submit incompatible third-party code, copied proprietary work, secrets, or real customer payloads. No separate Contributor License Agreement is currently required.

## Before opening an issue

Search existing issues and open PRs before reporting a problem or proposing a new feature. For a bug, describe the expected versus observed result, the Node.js version, and a **minimal synthetic JSON input** that reproduces it. Include the JSON Pointer path or change kind if relevant. Do not upload real customer payloads, credentials, access tokens, API keys, or private logs. For vulnerability reports, avoid public proof-of-concept disclosures containing secrets; use a private maintainer/security channel if one is made available or GitHub's reporting controls, and never paste sensitive data into an issue.

For a feature idea, describe the real use case, why the current API is insufficient, alternatives considered, and whether it fits the current milestone. Discuss design changes in an issue before doing substantial work.

## Local development

Clone the repository and use a separate branch for one issue. Node.js **22.12.0 or newer** is required. From a fresh checkout run:

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
