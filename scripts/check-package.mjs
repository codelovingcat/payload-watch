import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Run through `npm run check:package` after `npm run build`.
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("Run this check with `npm run check:package` after `npm run build`.");
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" },
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      `Command failed (${command} ${args.join(" ")}):\n${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
  return result.stdout;
}

function runNpm(args, cwd) {
  return run(process.execPath, [npmCli, ...args], cwd);
}

const tempRoot = mkdtempSync(join(tmpdir(), "payload-watch-package-check-"));
try {
  const packageMetadata = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(packageMetadata.private, true, "The package must remain private before release");
  assert.equal(packageMetadata.license, "MIT", "Package SPDX license must match LICENSE");
  assert.equal(packageMetadata.type, "module");
  assert.equal(packageMetadata.main, "./dist/index.js");
  assert.equal(packageMetadata.types, "./dist/index.d.ts");
  assert.equal(packageMetadata.exports["."].import, "./dist/index.js");
  assert.equal(packageMetadata.exports["."].types, "./dist/index.d.ts");

  const packed = JSON.parse(runNpm([
    "pack", "--json", "--ignore-scripts", "--pack-destination", tempRoot,
  ], repositoryRoot));
  assert.equal(packed.length, 1, "Expected one npm tarball");

  const entry = packed[0];
  const files = entry.files.map((file) => file.path);
  for (const required of ["package.json", "LICENSE", "dist/index.js", "dist/index.d.ts", "bin/payload-watch.mjs"]) {
    assert.ok(files.includes(required), `Package is missing ${required}`);
  }
  for (const path of files) {
    assert.ok(
      path === "package.json" || path === "LICENSE" || path === "README.md" || path.startsWith("dist/") || path.startsWith("docs/") || path.startsWith("bin/"),
      `Unexpected packed file: ${path}`,
    );
    assert.ok(!path.split("/").some((segment) => segment === ".env" || segment.startsWith(".env.")),
      `Environment file must not be packed: ${path}`);
  }

  const consumerRoot = join(tempRoot, "consumer");
  mkdirSync(consumerRoot);
  writeFileSync(join(consumerRoot, "package.json"), JSON.stringify({
    name: "payload-watch-package-consumer", private: true, type: "module",
  }, null, 2));

  const tarballPath = join(tempRoot, entry.filename);
  runNpm([
    "install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund",
    "--no-save", "--package-lock=false", tarballPath,
  ], consumerRoot);

  const runtimeSample = [
    'import assert from "node:assert/strict";',
    'import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "payload-watch";',
    'const report = comparePayloads({ id: 1 }, { id: "1" });',
    'assert.equal(report.changes.length, 1);',
    'assert.equal(report.changes[0].kind, "type-changed");',
    'assert.equal(report.changes[0].path, "/id");',
    'assert.match(formatComparisonReport(report), /Type changed/);',
    'assert.equal(typeof InvalidJsonInputError, "function");',
  ].join("\n");
  writeFileSync(join(consumerRoot, "consumer.mjs"), `${runtimeSample}\n`);
  run(process.execPath, ["consumer.mjs"], consumerRoot);

  const typedSample = [
    'import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "payload-watch";',
    'import type { CompareOptions, ComparisonReport, JsonValue, PayloadChange } from "payload-watch";',
    'const before: JsonValue = { id: 1, active: true };',
    'const after: JsonValue = { id: "1", active: true };',
    'const options: CompareOptions = { includeValues: false };',
    'const report: ComparisonReport = comparePayloads(before, after, options);',
    'const changes: readonly PayloadChange[] = report.changes;',
    'const output: string = formatComparisonReport(report);',
    'void changes; void output; void InvalidJsonInputError;',
  ].join("\n");
  writeFileSync(join(consumerRoot, "consumer.mts"), `${typedSample}\n`);
  writeFileSync(join(consumerRoot, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext",
      strict: true, noEmit: true, types: [], skipLibCheck: false,
    },
    files: ["consumer.mts"],
  }, null, 2));

  const tscPath = join(repositoryRoot, "node_modules", "typescript", "bin", "tsc");
  run(process.execPath, [tscPath, "-p", join(consumerRoot, "tsconfig.json")], consumerRoot);

  process.stdout.write(`Packed ${files.length} allowed files; external ESM and TypeScript consumers passed.\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
