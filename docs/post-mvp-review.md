# Post-MVP feature review and validation gate

**Tracking:** [Issue #28](https://github.com/codelovingcat/payload-watch/issues/28). This is a prioritized **candidate** list, not a commitment to ship every feature.

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
| Optional local CLI, JSON output, exit codes | Manual before/after snapshot checks are tedious | Small surface, separate from pure core | **Build as optional post-MVP**, #15 / #16; gate inclusion in initial npm release |
| Exact ignore paths | Request IDs and timestamps can mask useful changes | Medium risk of hidden meaningful drift | **Build opt-in only**, #17, document risk |
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

The v0.1 core remains the benchmark for release readiness. Later optional features being developed in separate PRs do not automatically become mandatory for v0.1 or block the first publication. Release planning should explicitly decide if any optional CLI or ignore functionality is included; a complete build can contain an optional feature while release scope is still awaiting final authorization.

**Review outcome:** Priorities and a reproducible feedback protocol are documented. Real adopter validation is **still pending**; this planning issue should remain open until actual feedback is recorded and reviewed.
