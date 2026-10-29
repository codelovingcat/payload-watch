import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const cli = new URL("../bin/payload-watch.mjs", import.meta.url);
const baseline = new URL("../examples/order-payloads/baseline.json", import.meta.url);
const current = new URL("../examples/order-payloads/current.json", import.meta.url);
const unchanged = new URL("../examples/order-payloads/unchanged.json", import.meta.url);
function run(...args) {
  const result = spawnSync(process.execPath, [cli.pathname, ...args], { encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}

describe("file comparison CLI", () => {
  it("prints documented help", () => {
    const p = run("--help");
    assert.equal(p.status, 0);
    assert.match(p.stdout, /^Usage: payload-watch compare/);
  });
  it("compares real order fixtures using the library", () => {
    const p = run("compare", baseline.pathname, current.pathname);
    assert.equal(p.status, 0);
    assert.match(p.stdout, /^7 changes detected:/);
    assert.match(p.stdout, /Type changed at \/orderId/);
    assert.equal(p.stderr, "");
  });
  it("reports identical fixtures", () => {
    const p = run("compare", baseline.pathname, unchanged.pathname);
    assert.equal(p.status, 0);
    assert.equal(p.stdout, "No changes detected.\n");
  });
  it("keeps usage and I/O failures separate from normal diffs", () => {
    const usage = run("unknown");
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /Usage:/);
    const missing = run("compare", baseline.pathname, "/this-path-should-not-exist/payload.json");
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /Cannot read current file/);
  });
  it("rejects invalid JSON without leaking its text", () => {
    const temp = mkdtempSync(join(tmpdir(), "payload-watch-cli-"));
    try {
      const bad = join(temp, "bad.json");
      writeFileSync(bad, '{"secret": "private",}');
      const p = run("compare", baseline.pathname, bad);
      assert.equal(p.status, 2);
      assert.match(p.stderr, /Invalid JSON in current file/);
      assert.ok(!p.stderr.includes("private"));
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
