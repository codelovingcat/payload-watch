import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inspectReleaseMetadata } from "../scripts/release-preflight.mjs";

const files = new Set(["LICENSE", "CHANGELOG.md", "README.md",
  "docs/versioning-policy.md", "docs/package-entrypoints.md", "docs/consumer-installation.md"]);
const good = { name: "payload-watch", version: "0.1.0", private: false, license: "MIT",
  type: "module", main: "./dist/index.js", types: "./dist/index.d.ts",
  exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } } };
describe("release metadata preflight guard", () => {
  it("blocks private, placeholder-version packages with missing license", () => {
    const blockers = inspectReleaseMetadata({ ...good, private: true, version: "0.0.0", license: undefined },
      { version: "0.0.0", packages: { "": { version: "0.0.0" } } }, new Set(["README.md"]));
    assert.ok(blockers.some(x => x.includes("private")));
    assert.ok(blockers.some(x => x.includes("version")));
    assert.ok(blockers.some(x => x.includes("License")));
  });
  it("only accepts consistent metadata, not permission to publish", () => {
    assert.deepEqual(inspectReleaseMetadata(good,
      { version: "0.1.0", packages: { "": { version: "0.1.0" } } }, files), []);
  });
  it("rejects changed exports and lockfile mismatch", () => {
    const blockers = inspectReleaseMetadata({ ...good, main: "./src/index.ts" },
      { version: "0.0.0", packages: { "": { version: "0.0.0" } } }, files);
    assert.ok(blockers.some(x => x.includes("export/type")));
    assert.ok(blockers.some(x => x.includes("Lockfile")));
  });
});
