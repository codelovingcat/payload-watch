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

describe("CI-friendly CLI output and exit codes", () => {
  it("writes machine-readable JSON without ANSI or values", () => {
    const p = run("compare", "--format", "json", baseline.pathname, current.pathname);
    assert.equal(p.status, 0);
    assert.equal(p.stderr, "");
    const data = JSON.parse(p.stdout);
    assert.equal(data.changes.length, 7);
    assert.deepEqual(data.changes[0], { kind: "added", path: "/customer/fullName", currentType: "string" });
    assert.ok(!p.stdout.includes("\u001b"));
    assert.ok(!p.stdout.includes("Alex Morgan"));
  });
  it("supports --format=text and --format=json", () => {
    const text = run("compare", "--format=text", baseline.pathname, current.pathname);
    assert.equal(text.status, 0);
    assert.match(text.stdout, /^7 changes detected:/);
    const json = run("compare", baseline.pathname, current.pathname, "--format=json");
    assert.equal(json.status, 0);
    assert.equal(JSON.parse(json.stdout).changes.length, 7);
  });
  it("returns exit 1 only on changes when fail-on-change is enabled", () => {
    const different = run("compare", "--fail-on-change", baseline.pathname, current.pathname);
    assert.equal(different.status, 1);
    assert.match(different.stdout, /^7 changes detected:/);
    const same = run("compare", "--fail-on-change", "--format=json", baseline.pathname, unchanged.pathname);
    assert.equal(same.status, 0);
    assert.deepEqual(JSON.parse(same.stdout), { changes: [] });
  });
  it("uses exit 2 and stderr for errors, never stdout", () => {
    const invalid = run("compare", "--format", "xml", baseline.pathname, current.pathname);
    assert.equal(invalid.status, 2);
    assert.equal(invalid.stdout, "");
    assert.match(invalid.stderr, /--format must be text or json/);
    const duplicate = run("compare", "--fail-on-change", "--fail-on-change", baseline.pathname, current.pathname);
    assert.equal(duplicate.status, 2);
    const missing = run("compare", "--fail-on-change", baseline.pathname, "/this-path-should-not-exist/payload.json");
    assert.equal(missing.status, 2);
    assert.equal(missing.stdout, "");
  });
});
