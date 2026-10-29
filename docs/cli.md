# Optional local JSON file comparison CLI

**Tracking issue:** [#15](https://github.com/codelovingcat/payload-watch/issues/15) (post-MVP developer experience).

## Choice and boundary

The CLI is an **optional executable entry point within the existing npm package**. Its `bin/payload-watch.mjs` source is separate from the core `src/` comparison library. The core remains callable without file I/O, network calls, storage, or invoking the CLI. This extension is **post-MVP**; inclusion in any public npm release requires explicit release-scope review.

Build first, then run:

```bash
npm ci
npm run build
node bin/payload-watch.mjs compare examples/order-payloads/baseline.json examples/order-payloads/current.json
```

Once a locally packed archive is installed in a consumer project, its executable name is `payload-watch`:

```bash
payload-watch compare previous.json current.json
```

Run `payload-watch --help` for usage. The CLI reads the two named **UTF-8 JSON files**, parses them using `JSON.parse`, then calls the same `comparePayloads` function and `formatComparisonReport` as the public library. Passing JSON text as a JS string to the library is not the same as parsing files.

## Behavior and errors

- Arguments are positional: `compare <previous.json> <current.json>`. Neither input is modified.
- Differences print to stdout with one line per change. **Exit 0** means the operation ran, whether or not differences were found; this CLI does not currently fail merely because JSON changed.
- Missing arguments or unknown commands: usage message on stderr and exit **2**.
- Unreadable files or invalid JSON text: a concise stderr message and exit **2**. Invalid JSON text is never echoed.
- Unsupported parsed numbers, including `1e400` (which becomes infinity), can cause `InvalidJsonInputError`; the message reports only input argument, path, and short reason.
- No automatic HTTP requests, API credentials or extra runtime dependencies. Avoid using production payloads for bug reports or CI logs.

Focused integration checks use local synthetic fixture files: `npm run test:cli` (after `npm run build`). CI verifies Node.js 22 and 24.

**Next:** [Issue #16](https://github.com/codelovingcat/payload-watch/issues/16) defines machine-readable output and optional fail-on-change exit codes. Those modes are not yet included in this PR.
