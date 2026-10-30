import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const cli = fileURLToPath(new URL("../bin/payload-watch.mjs", import.meta.url));
const baseline = fileURLToPath(new URL("../examples/order-payloads/baseline.json", import.meta.url));
const current = fileURLToPath(new URL("../examples/order-payloads/current.json", import.meta.url));
const unchanged = fileURLToPath(new URL("../examples/order-payloads/unchanged.json", import.meta.url));
function run(...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}

function withMissingJsonFile(callback) {
  // The file never exists: its parent is a newly created, isolated directory.
  const dir = mkdtempSync(join(tmpdir(), "payload-watch-missing-"));
  try {
    return callback(join(dir, "not-created.json"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function withJsonBytes(previous, current, callback) {
  const dir = mkdtempSync(join(tmpdir(), "payload-watch-encoding-"));
  try {
    const before = join(dir, "before.json");
    const after = join(dir, "after.json");
    writeFileSync(before, previous);
    writeFileSync(after, current);
    callback(before, after);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("CLI UTF-8 input contract", () => {
  for (const input of ["previous", "current"]) {
    it(`rejects malformed UTF-8 in the ${input} file without exposing its contents`, () => {
      for (const bytes of [[0x80], [0xc3], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xf0, 0x9f]]) {
        const invalid = Buffer.concat([
          Buffer.from('{"secret":"private-encoding-value'), Buffer.from(bytes), Buffer.from('"}'),
        ]);
        const valid = '{"secret":"valid"}';
        withJsonBytes(input === "previous" ? invalid : valid, input === "current" ? invalid : valid, (before, after) => {
          const p = run("compare", "--format=json", "--fail-on-change", before, after);
          assert.equal(p.status, 2);
          assert.equal(p.stdout, "");
          assert.equal(p.stderr, `payload-watch: Invalid UTF-8 in ${input} file\n`);
        });
      }
    });
  }

  it("does not turn two differently corrupted documents into an unchanged comparison", () => {
    const malformed = byte => Buffer.concat([Buffer.from('{"id":"'), Buffer.from([byte]), Buffer.from('"}')]);
    withJsonBytes(malformed(0x80), malformed(0x81), (before, after) => {
      const p = run("compare", "--fail-on-change", before, after);
      assert.equal(p.status, 2);
      assert.equal(p.stdout, "");
      assert.match(p.stderr, /Invalid UTF-8 in previous file/);
    });
  });

  it("accepts one leading UTF-8 BOM in either or both inputs", () => {
    for (const [beforeBom, afterBom] of [[true, false], [false, true], [true, true]]) {
      withJsonBytes(`${beforeBom ? "\ufeff" : ""}{"id":1}`, `${afterBom ? "\ufeff" : ""}{"id":2}`, (before, after) => {
        const p = run("compare", "--format=json", "--fail-on-change", before, after);
        assert.equal(p.status, 1, p.stderr);
        assert.equal(p.stderr, "");
        assert.deepEqual(JSON.parse(p.stdout).changes, [
          { kind: "value-changed", path: "/id", previousType: "number", currentType: "number" },
        ]);
        const same = run("compare", "--fail-on-change", after, after);
        assert.equal(same.status, 0, same.stderr);
      });
    }
  });

  it("preserves U+FEFF within JSON strings and ordinary Unicode text", () => {
    withJsonBytes('\ufeff{"value":"İstanbul 雪 😀\ufeff"}', '{"value":"İstanbul 雪 😀"}', (before, after) => {
      const p = run("compare", "--format=json", "--fail-on-change", before, after);
      assert.equal(p.status, 1, p.stderr);
      assert.deepEqual(JSON.parse(p.stdout).changes.map(c => c.path), ["/value"]);
    });
  });

  it("does not remove a second BOM from the JSON document", () => {
    withJsonBytes("{}", "\ufeff\ufeff{}", (before, after) => {
      const p = run("compare", before, after);
      assert.equal(p.status, 2);
      assert.equal(p.stdout, "");
      assert.match(p.stderr, /Invalid JSON in current file/);
    });
  });

  it("rejects UTF-16 input", () => {
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('{"id":1}', "utf16le")]);
    withJsonBytes("{}", utf16, (before, after) => {
      const p = run("compare", before, after);
      assert.equal(p.status, 2);
      assert.equal(p.stdout, "");
      assert.equal(p.stderr, "payload-watch: Invalid UTF-8 in current file\n");
    });
  });
});

describe("file comparison CLI", () => {
  it("prints documented help", () => {
    const p = run("--help");
    assert.equal(p.status, 0);
    assert.match(p.stdout, /^Usage: payload-watch compare/);
  });
  it("compares real order fixtures using the library", () => {
    const p = run("compare", baseline, current);
    assert.equal(p.status, 0);
    assert.match(p.stdout, /^7 changes detected:/);
    assert.match(p.stdout, /Type changed at \/orderId/);
    assert.equal(p.stderr, "");
  });
  it("reports identical fixtures", () => {
    const p = run("compare", baseline, unchanged);
    assert.equal(p.status, 0);
    assert.equal(p.stdout, "No changes detected.\n");
  });
  it("keeps usage and I/O failures separate from normal diffs", () => {
    const usage = run("unknown");
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /Usage:/);
    withMissingJsonFile((missingFile) => {
      const missing = run("compare", baseline, missingFile);
      assert.equal(missing.status, 2);
      assert.match(missing.stderr, /Cannot read current file/);
    });
  });
  it("rejects invalid JSON without leaking its text", () => {
    const temp = mkdtempSync(join(tmpdir(), "payload-watch-cli-"));
    try {
      const bad = join(temp, "bad.json");
      writeFileSync(bad, '{"secret": "private",}');
      const p = run("compare", baseline, bad);
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
    const p = run("compare", "--format", "json", baseline, current);
    assert.equal(p.status, 0);
    assert.equal(p.stderr, "");
    const data = JSON.parse(p.stdout);
    assert.equal(data.changes.length, 7);
    assert.deepEqual(data.changes[0], { kind: "added", path: "/customer/fullName", currentType: "string" });
    assert.ok(!p.stdout.includes("\u001b"));
    assert.ok(!p.stdout.includes("Alex Morgan"));
  });
  it("supports --format=text and --format=json", () => {
    const text = run("compare", "--format=text", baseline, current);
    assert.equal(text.status, 0);
    assert.match(text.stdout, /^7 changes detected:/);
    const json = run("compare", baseline, current, "--format=json");
    assert.equal(json.status, 0);
    assert.equal(JSON.parse(json.stdout).changes.length, 7);
  });
  it("returns exit 1 only on changes when fail-on-change is enabled", () => {
    const different = run("compare", "--fail-on-change", baseline, current);
    assert.equal(different.status, 1);
    assert.match(different.stdout, /^7 changes detected:/);
    const same = run("compare", "--fail-on-change", "--format=json", baseline, unchanged);
    assert.equal(same.status, 0);
    assert.deepEqual(JSON.parse(same.stdout), { changes: [] });
  });
  it("uses exit 2 and stderr for errors, never stdout", () => {
    const invalid = run("compare", "--format", "xml", baseline, current);
    assert.equal(invalid.status, 2);
    assert.equal(invalid.stdout, "");
    assert.match(invalid.stderr, /--format must be text or json/);
    const duplicate = run("compare", "--fail-on-change", "--fail-on-change", baseline, current);
    assert.equal(duplicate.status, 2);
    withMissingJsonFile((missingFile) => {
      const missing = run("compare", "--fail-on-change", baseline, missingFile);
      assert.equal(missing.status, 2);
      assert.equal(missing.stdout, "");
      assert.match(missing.stderr, /Cannot read current file/);
    });
  });
});


describe("unsafe JSON Pointer characters in CLI output", () => {
  it("escapes text paths without changing the structured JSON paths or exit codes", () => {
    const dir = mkdtempSync(join(tmpdir(), "payload-watch-control-path-"));
    try {
      const before = join(dir, "before.json");
      const after = join(dir, "after.json");
      const key = "key\nforged\r\t\u001b[31m";
      writeFileSync(before, JSON.stringify({ [key]: "old" }));
      writeFileSync(after, JSON.stringify({ [key]: "new" }));

      const readable = run("compare", "--format", "text", before, after);
      assert.equal(readable.status, 0);
      assert.equal(readable.stderr, "");
      assert.ok(readable.stdout.includes("/key\\nforged\\r\\t\\u001b[31m"));
      assert.equal(readable.stdout.split("\n").length, 3);
      assert.ok(!readable.stdout.includes("\u001b"));
      assert.ok(!readable.stdout.includes("\r"));
      assert.ok(!readable.stdout.includes("\t"));

      const json = run("compare", "--format=json", "--fail-on-change", before, after);
      assert.equal(json.status, 1);
      assert.equal(json.stderr, "");
      assert.equal(JSON.parse(json.stdout).changes[0].path, "/" + key);
      assert.equal(JSON.parse(json.stdout).changes[0].kind, "value-changed");
      assert.ok(!("values" in JSON.parse(json.stdout).changes[0]));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});


describe("cross-platform CLI filesystem paths", () => {
  it("compares files in paths containing spaces and non-ASCII characters", () => {
    const dir = mkdtempSync(join(tmpdir(), "payload-watch space-é-"));
    try {
      const previous = join(dir, "önce payload.json");
      const next = join(dir, "sonra payload.json");
      writeFileSync(previous, JSON.stringify({ "mağaza": { status: "ready" } }));
      writeFileSync(next, JSON.stringify({ "mağaza": { status: "processing" } }));

      // A file URL's .pathname is not an OS path on Windows (and is URL-encoded).
      const beforePath = fileURLToPath(pathToFileURL(previous));
      const afterPath = fileURLToPath(pathToFileURL(next));
      assert.equal(beforePath, previous);
      assert.equal(afterPath, next);

      const textResult = run("compare", beforePath, afterPath);
      assert.equal(textResult.status, 0, textResult.stderr);
      assert.equal(textResult.stderr, "");
      assert.match(textResult.stdout, /Value changed at \/mağaza\/status/);

      const jsonResult = run("compare", "--format=json", "--fail-on-change", beforePath, afterPath);
      assert.equal(jsonResult.status, 1, jsonResult.stderr);
      assert.equal(jsonResult.stderr, "");
      assert.deepEqual(JSON.parse(jsonResult.stdout).changes.map(change => change.path), ["/mağaza/status"]);

      const same = run("compare", "--fail-on-change", "--format=json", afterPath, afterPath);
      assert.equal(same.status, 0, same.stderr);
      assert.deepEqual(JSON.parse(same.stdout), { changes: [] });

      const missing = run("compare", "--format=json", beforePath, join(dir, "olmayan payload.json"));
      assert.equal(missing.status, 2);
      assert.equal(missing.stdout, "");
      assert.match(missing.stderr, /Cannot read current file/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("safe CLI error display", () => {
  const unsafe = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;

  it("escapes controls in unknown option arguments", () => {
    const p = run("compare", "--unknown\nFORGED\r\t\u001b[31m\u009b\u202e");
    assert.equal(p.status, 2);
    assert.equal(p.stdout, "");
    assert.ok(!unsafe.test(p.stderr));
    assert.equal(p.stderr.trimEnd().split("\n").length, 1);
    assert.match(p.stderr, /Unknown option:/);
    assert.ok(p.stderr.includes("\\u001b"));
    assert.ok(p.stderr.includes("\\u009b"));
  });

  it("escapes validation paths on stderr and preserves successful JSON output paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "payload-watch-error-display-"));
    try {
      const before = join(dir, "before.json"), after = join(dir, "after.json");
      const key = "key\u009b2J\u202e\u2028\u061c\u200e\u200f";
      writeFileSync(before, "{}");
      writeFileSync(after, JSON.stringify({ [key]: 0 }).replace(":0", ":1e400"));
      const invalid = run("compare", before, after);
      assert.equal(invalid.status, 2);
      assert.equal(invalid.stdout, "");
      assert.ok(!unsafe.test(invalid.stderr));
      assert.equal(invalid.stderr.trimEnd().split("\n").length, 1);
      assert.ok(invalid.stderr.includes("\\u009b"));
      writeFileSync(after, JSON.stringify({ [key]: 1 }));
      const valid = run("compare", "--format=json", before, after);
      assert.equal(valid.status, 0, valid.stderr);
      assert.equal(JSON.parse(valid.stdout).changes[0].path, "/" + key);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
