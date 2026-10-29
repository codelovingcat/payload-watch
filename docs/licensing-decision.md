# License decision — owner approval required

**Tracking issue:** [#23 — Choose a license and document contribution expectations](https://github.com/codelovingcat/payload-watch/issues/23)  
**Status:** **Pending maintainer decision**. This document is a decision record, not a license grant.

## Current status

PayloadWatch currently has **no software LICENSE file** and no `license` field in `package.json`. Its publicly viewable repository is **not yet licensed for general open-source use or redistribution**. GitHub's platform terms allow activities such as viewing and forking on GitHub but do not substitute for a project-wide open-source license. Do not label the package “MIT licensed” or “Apache licensed” until the copyright holder chooses and adds a license.

The owner should decide whether the library is intended for broad permissive adoption, reciprocal sharing, or to stay unlicensed for now.

## Options to decide between

| Option | What it means for this library | Practical trade-off |
| --- | --- | --- |
| **MIT** | Short, permissive terms; permits commercial and proprietary use with retention of the license and copyright notice. | Simple for adoption; does not contain the same express patent license as Apache-2.0. |
| **Apache-2.0** | Permissive, including commercial/proprietary use; includes an express contributor patent grant and related conditions. | More detailed notice and change-marking obligations than MIT. |
| **GPL-3.0-only** | Copyleft terms for redistribution of covered derivative works; source-sharing duties apply when distributing covered works. | Stronger reciprocal requirements; potentially harder for proprietary consumers of a library. |
| **No license yet** | The copyright holder keeps default rights; viewing a public repository does not grant general reuse or redistribution rights. | Fine for an unpublished experiment, but unclear/unsuitable for a broadly reusable public library. |

**Working suggestion (not a decision):** MIT is worth considering if the priority is a small, easy-to-adopt JSON comparison library. Apache-2.0 may be preferable if its explicit patent provisions matter. GPL-3.0-only better fits a deliberate copyleft preference. A public repository does not require selecting any of these.

For primary guidance, see [GitHub's licensing documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository), [Choose a License](https://choosealicense.com/), and [SPDX license identifiers](https://spdx.org/licenses/). License compatibility and copyright ownership may need additional review when accepting outside code.

## Decision checklist

- [ ] Maintainer explicitly chooses **MIT**, **Apache-2.0**, **GPL-3.0-only**, or **no license for now**.
- [ ] If choosing a license: confirm the copyright holder / attribution text and ownership of the code (including any contributions).
- [ ] Add the **unchanged official license text** at the repository root in `LICENSE` (and applicable notice files only if required).
- [ ] Record the exact SPDX expression in `package.json`, and add a short accurate license note in `README.md`.
- [ ] Update the existing `scripts/check-package.mjs` distribution allowlist so the required license file is allowed **and verified as present in the actual package**. Adjust `docs/package-entrypoints.md` and release-readiness documentation accordingly.
- [ ] Confirm GitHub CI (Node.js 22 and 24) succeeds and verify the license appears in the packed archive.
- [ ] Only after the explicit decision and corresponding changes are complete, close [Issue #23](https://github.com/codelovingcat/payload-watch/issues/23).

## Code of Conduct and contributions

A lightweight [Code of Conduct](../CODE_OF_CONDUCT.md) sets expectations for respectful technical collaboration. [Contributing](../CONTRIBUTING.md) gives concrete issue, test, and PR guidance. Until the license and contribution terms are decided, incoming code contributions should **not** be merged into the repository. A dedicated private moderation contact can be added if the community grows; this is not needed to decide the software license.

**Decision log:** No selection or grant has been recorded. This PR intentionally does **not** add a `LICENSE` file, edit `package.json` licensing, or claim Issue #23 is closed.
