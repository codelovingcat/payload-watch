# Optional ignorePaths — exact JSON Pointer rules

**Tracking:** [Issue #17](https://github.com/codelovingcat/payload-watch/issues/17). This was developed as a **post-MVP** option and is **included** in the `0.1.0` release; pre-1.0 contracts may change.

Pass `ignorePaths` to `comparePayloads` to omit exact JSON Pointer locations **and descendants**:

```ts
comparePayloads(
  { meta: { requestId: "a", status: "ok" } },
  { meta: { requestId: "b", status: "changed" } },
  { ignorePaths: ["/meta/requestId"] },
);
// Reports only /meta/status.
```

Rules use RFC 6901 escaping: `~1` means slash, `~0` means tilde. Matching is segment-aware, so `/id` does **not** ignore `/identity`. There are **no** wildcard or regex patterns; `/data/*` matches a literal key named `*`. `""` explicitly ignores the root (all changes). Repeated identical rules are rejected, overlapping parent/child rules are allowed but redundant, and empty path segments are valid JSON Pointer syntax.

Ignoring a descendant like `/a/x` does **not** suppress a type change at parent `/a`. Array indices are positional, not identities. Invalid rules (wrong input type, malformed pointer, duplicates) throw `TypeError`. Without `ignorePaths`, comparison behavior is unchanged; ignored records are omitted entirely rather than marked "ignored". Value privacy remains opt-in via `includeValues`.

**Risk:** Ignoring any field can hide meaningful or breaking contract changes. Keep rules narrow, document why they exist and review them after provider changes. The `0.1.0` candidate explicitly includes it; this does not make broad ignore rules safe or promise stable behavior before 1.0.
