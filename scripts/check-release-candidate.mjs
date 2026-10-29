import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// This guard checks candidate metadata only; it never contacts or publishes to npm.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

assert.equal(pkg.name, "payload-watch");
assert.equal(pkg.version, "0.1.0");
assert.equal(pkg.private, true, "Candidate must stay private until explicitly approved");
assert.equal(pkg.license, "MIT");
assert.equal(pkg.type, "module");
assert.equal(pkg.engines.node, ">=22.12.0");
assert.equal(pkg.repository.url, "git+https://github.com/codelovingcat/payload-watch.git");
assert.equal(pkg.homepage, "https://github.com/codelovingcat/payload-watch#readme");
assert.equal(pkg.bugs.url, "https://github.com/codelovingcat/payload-watch/issues");
assert.equal(pkg.main, "./dist/index.js");
assert.equal(pkg.types, "./dist/index.d.ts");
assert.equal(pkg.exports["."].types, "./dist/index.d.ts");
assert.equal(pkg.exports["."].import, "./dist/index.js");
assert.equal(pkg.bin["payload-watch"], "./bin/payload-watch.mjs");

assert.equal(lock.name, pkg.name);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[""].name, pkg.name);
assert.equal(lock.packages[""].version, pkg.version);
assert.ok(pkg.files.includes("bin/"));
assert.ok(pkg.files.includes("dist/"));
assert.ok(existsSync(join(root, "LICENSE")));
assert.ok(existsSync(join(root, "bin/payload-watch.mjs")));
assert.ok(existsSync(join(root, "dist/index.js")), "Build before checking candidate");
assert.ok(existsSync(join(root, "dist/index.d.ts")), "Build before checking candidate");

const changelog = read("CHANGELOG.md");
const notes = read("docs/release-notes-0.1.0.md");
const readme = read("README.md");
const checklist = read("docs/first-release-checklist.md");
const workflow = read(".github/workflows/ci.yml");
assert.ok(changelog.includes("0.1.0") && changelog.includes("Unreleased"));
assert.ok(notes.includes("0.1.0") && notes.toLowerCase().includes("not published"));
assert.ok(readme.includes("private") && readme.includes("0.1.0"));
assert.ok(checklist.includes("private-package blocker"));
assert.ok(!workflow.includes("npm publish"), "CI must never auto-publish");
assert.ok(!workflow.includes("id-token: write"), "No release credential permission in CI");

console.log("Private PayloadWatch 0.1.0 candidate metadata, types, CLI and notes: passed.");
console.log("No publication occurred. npm registry name, account permissions and final approval still require release review.");
