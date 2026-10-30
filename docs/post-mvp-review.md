# Post-MVP feature review and validation gate

**Tracking:** [Issue #28](https://github.com/codelovingcat/payload-watch/issues/28). The table below records the **original evaluation decisions**; the subsequent release-scope update records what was actually included in the unpublished `0.1.0` candidate. Deferred candidates are not commitments.

## Evaluation evidence — October 2026

The working MVP has a deterministic core comparison API, path-aware validation, human-readable and structured reports, synthetic order-response fixtures and CI checks on Node.js 22/24. The fixture pair exercises seven concrete issues: a renamed-looking customer key, a numeric-to-string order ID, changed quantity, an appended item and shipping changes. This is **internal scenario evidence**, not external customer interviews or measured production demand.

A review of comparable tools shows why PayloadWatch should avoid becoming a full general-purpose diff/patch/schema engine:

- [jsondiffpatch](https://www.npmjs.com/package/jsondiffpatch) already offers object/array diffs, optional identity-aware array matching, patching and multiple output formats. Avoid duplicating its entire general-purpose surface.
- [Ajv](https://www.npmjs.com/package/ajv) already handles JSON Schema validation. Schema-aware diagnostics would need distinct user evidence and a clear integration boundary.

These alternatives were reviewed for **overlap and maintenance cost**, not claimed to be inferior. There has not yet been any public adopter feedback collected by this document.

## Priorities and confidence

| Candidate | Problem demonstrated | Estimated maintenance / new dependencies | Decision |
| --- | --- | --- | --- |
| Core JSON Pointer diagnostics and readable reports | Existing synthetic order examples show hard-to-find nested drift | Already in MVP | **Keep as primary focus** |
| Optional local CLI, JSON output, exit codes | Manual before/after snapshot checks are tedious | Small surface, separate from pure core | **Originally approved as optional post-MVP** (#15 / #16); **now implemented and included** in the unpublished `0.1.0` candidate |
| Exact ignore paths | Request IDs and timestamps can mask useful changes | Medium risk of hidden meaningful drift | **Originally approved opt-in** (#17); **now implemented and included** in the unpublished `0.1.0` candidate |
| Identity-aware array matching | Inserting at index zero creates noisy positional comparisons | High complexity and ambiguous identity semantics | **Defer**, validate stable-key use case first |
| JSON Schema / OpenAPI-aware contract impact | Need to know if a structural change breaks a particular consumer | High, existing tools solve parts of it | **Defer**, do not infer breaking behavior from two payloads |
| Additional report renderers / editor integrations | Useful only if human-readable text is insufficient | Medium, interface fragmentation | **Explore only after user requests** |
| Background API snapshot capture / live monitoring | Useful to users who cannot obtain snapshots | High, includes credentials/networking/data retention | **Separate product/major scope decision**, not core library |
| A dedicated CI action | Project teams may want an easy reusable workflow | Maintenance, permissions and ecosystem overlap | **Defer**, start by documenting ordinary CLI usage |

## Feedback that remains to be collected

Ask developers to run a checkout with the synthetic order pair or their own **sanitized** JSON samples, then answer:

1. Which reported path/change reduced debugging time? Which differences were noisy or misleading?
2. Are arrays ordered by position, or do objects carry stable identity keys?
3. Would an ignore rule hide a meaningful breaking change? Which exact JSON Pointer is volatile?
4. Is programmatic library use sufficient, or is a CLI / CI action essential?
5. What Node.js, module system and deployment constraints apply?
6. Which alternative tools were already considered, and which unmet requirement justifies this project?

Collect issue links, redacted reproduction cases and concrete acceptance criteria. **Never request production payloads, access tokens or customer identities.** Without actual adopter feedback, treat priority decisions as provisional. New high-effort work requires a distinct issue with its own reproducible problem, API boundary, test requirements and release impact.

## First release scope gate

The v0.1 core remains the benchmark for release readiness. **The release-scope decision is now recorded:** the implemented local-file CLI and optional `ignorePaths` are included in the unpublished `0.1.0` candidate, as documented in [Release Notes](release-notes-0.1.0.md). Their inclusion does not authorize npm publication or promise API stability before 1.0. Other proposed extensions remain deferred until actual user evidence supports a separate issue.

**Review outcome:** Internal scenario review, candidate priorities, trade-offs and the feedback intake protocol are documented and executable. This completes the *planning* deliverable; **external adopter feedback remains uncollected** and must never be represented as validated demand. New feature decisions require real user evidence.

## Reproducible internal scenario review

Run the *actual implemented* library and CLI together after a build:

```bash
npm ci
npm run build
node scripts/verify-post-mvp-scenarios.mjs
```

The GitHub Actions Node.js 22 and 24 matrix runs the same command. The script uses only the existing fictional order fixtures and small synthetic objects, checks exact change paths, ensures values are omitted by default, and verifies that the CLI exits with 1 only when explicitly asked to fail on observed differences.

| Scenario | Expected observation | Practical conclusion |
| --- | --- | --- |
| Fictional order response drift | Seven stable JSON Pointer changes | Core drift diagnostics solve the primary sample debugging task |
| Insert one object at the front of a two-element array | Three positional findings (`/items/0/sku`, `/items/1/sku`, `/items/2`) | Index-based comparison creates noise when element identity matters; do not infer moves |
| Change request ID and business status | Two findings by default; one (`/status`) when ignoring `/requestId` | Exact-path ignores reduce specific noise but **can conceal important changes** |
| CLI machine output with `--fail-on-change` | Same seven paths, no value snapshots, exit 1 | Existing CLI supports scripts without requiring an additional CI Action |
| Compare a payload with itself | Zero changes | No false drift for unchanged values in this scenario |

**Evidence level:** this is a reproducible **internal engineering evaluation**, not external developer interviews, production telemetry or a performance benchmark. It does not measure time saved in real workflows.

### Adoption feedback workflow

Developers can use the [feedback issue template](https://github.com/codelovingcat/payload-watch/blob/main/.github/ISSUE_TEMPLATE/developer-feedback.md) after trying the synthetic example or a locally sanitized sample. It asks what genuinely helped, what was misleading, whether arrays have stable identifiers, which exact paths are volatile, whether a CLI is useful, and which competing tool was considered. Never paste actual customer payloads, credentials or private log contents.

A maintained feedback ledger should link *actual* submitted issues and observed reproductions; until such feedback exists, do **not** claim external validation. The planning assessment can be complete while future adopter validation remains an explicit follow-on activity.

### Decision for the first release review

Prioritize **no further post-MVP features** before the first public release. The CLI and `ignorePaths` have been explicitly included in the unpublished `0.1.0` release candidate, with documented pre-1.0 limitations. Their removal would require a reviewed package/API change, not just altered wording. Keep schema-aware impact, identity-aware arrays and monitoring out of this initial release absent concrete validated demand.
