# Optional JSON comparison CLI

**Issues:** [#15](https://github.com/codelovingcat/payload-watch/issues/15) and [#16](https://github.com/codelovingcat/payload-watch/issues/16). This CLI was developed as **post-MVP work**, but is **included** in the private `0.1.0` candidate after review. npm publication remains gated separately. The CLI contract may evolve in pre-1.0 versions.

After `npm ci && npm run build`:

```bash
node bin/payload-watch.mjs compare examples/order-payloads/baseline.json examples/order-payloads/current.json
node bin/payload-watch.mjs compare --format json --fail-on-change examples/order-payloads/baseline.json examples/order-payloads/current.json
```

The locally installed executable is `payload-watch`:

```text
payload-watch compare [--format text|json] [--fail-on-change] <previous.json> <current.json>
```

Options may occur before or after file paths. `--format=json` works as well as `--format json`. `--help` prints usage. Stdin is not supported.

### Unusual key names and safe text output

For text output only, JSON Pointer paths are display-escaped: a key containing a literal newline, carriage return, tab or ESC cannot insert another report line or terminal control sequence. For example, a key containing `line` + newline + `break` displays as `/line\nbreak`. Literal backslashes are doubled. Other control characters appear as `\uXXXX`.

**JSON output and the library's `ComparisonReport` retain the exact canonical RFC 6901 paths.** Use `--format json` in scripts; do not parse the human-readable summary as machine data. Display escaping does not redact potentially sensitive property names.
## Output contracts

- **Default `--format text`**: the core `formatComparisonReport` human-readable summary, with a newline.
- **`--format json`**: exactly `JSON.stringify(comparePayloads(previous, current))` and one newline, with top-level `changes` array and no ANSI codes, headers, timestamps or payload values.
- **`--fail-on-change`**: switches exit code to `1` if **any** JSON difference exists. This is not a breaking-change verdict.

| Exit code | Meaning |
| --- | --- |
| **0** | Valid comparison, regardless of differences unless fail-on-change was requested. |
| **1** | Valid comparison with differences, and fail-on-change requested. |
| **2** | Invalid arguments, unreadable files, bad JSON or failed runtime input validation. |

All errors go to stderr without echoing JSON input text; successful results go to stdout. Both modes omit values by default; JSON Pointer property names can still reveal sensitive information. The CLI does not make HTTP requests or mutate files.

The CLI is separate from the pure library comparison API. Test with `npm run test:cli` after `npm run build`. CI runs it on Node.js 22 and 24.
