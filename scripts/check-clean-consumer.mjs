import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "Run with npm run check:consumer after npm run build");
const tempRoot = mkdtempSync(join(tmpdir(), "payload-watch-clean-consumer-"));

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd, encoding: "utf8",
    env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Failed: ${command} ${args.join(" ")}\n${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
  return result.stdout;
}

function npm(args, cwd) {
  return run(process.execPath, [npmCli, ...args], cwd);
}

try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.private, false, "Release metadata must permit public publication");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.main, "./dist/index.js");
  assert.equal(pkg.types, "./dist/index.d.ts");
  assert.equal(pkg.exports["."].import, pkg.main);
  assert.equal(pkg.exports["."].types, pkg.types);
  assert.equal(pkg.dependencies, undefined, "The current core library must not need runtime dependencies");

  const dry = JSON.parse(npm(["pack", "--dry-run", "--json", "--ignore-scripts"], root));
  const actual = JSON.parse(npm([
    // A publish dry run still needs a real local tarball for consumer validation.
    "pack", "--dry-run=false", "--json", "--ignore-scripts", "--pack-destination", tempRoot,
  ], root));
  assert.equal(dry.length, 1);
  assert.equal(actual.length, 1);
  const dryPaths = dry[0].files.map((f) => f.path).sort();
  const actualPaths = actual[0].files.map((f) => f.path).sort();
  assert.deepEqual(actualPaths, dryPaths, "Dry-run and generated archive must contain the same files");
  for (const path of ["package.json", "README.md", "CHANGELOG.md", "dist/index.js", "dist/index.d.ts", "bin/payload-watch.mjs"]) {
    assert.ok(actualPaths.includes(path), `Missing packed file: ${path}`);
  }
  if (pkg.license) {
    assert.ok(actualPaths.includes("LICENSE"), "Licensed package must include LICENSE");
  }
  for (const path of actualPaths) {
    assert.ok(
      path === "package.json" || path === "README.md" || path === "LICENSE" || path === "CHANGELOG.md" ||
      path.startsWith("dist/") || path.startsWith("docs/") || path.startsWith("bin/"),
      `Unexpected file in archive: ${path}`,
    );
    assert.ok(!path.split("/").some((segment) => segment === ".env" || segment.startsWith(".env.")),
      `Potential secret-bearing file in archive: ${path}`);
  }

  const consumer = join(tempRoot, "consumer");
  mkdirSync(consumer);
  writeFileSync(join(consumer, "package.json"), JSON.stringify({
    name: "payload-watch-external-consumer", version: "1.0.0", private: true, type: "module",
  }, null, 2));
  const archivePath = join(tempRoot, actual[0].filename);
  assert.ok(existsSync(archivePath), "npm pack did not create the archive");
  npm(["install", "--dry-run=false", "--offline", "--ignore-scripts", "--no-audit", "--no-fund",
       "--no-save", "--package-lock=false", archivePath], consumer);

  const installed = join(consumer, "node_modules", "payload-watch");
  assert.ok(existsSync(join(installed, "dist", "index.js")));
  assert.ok(existsSync(join(installed, "dist", "index.d.ts")));
  const installedPkg = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
  assert.equal(installedPkg.name, "payload-watch");
  assert.equal(installedPkg.version, pkg.version);
  if (pkg.license) {
    assert.equal(installedPkg.license, pkg.license);
    assert.ok(existsSync(join(installed, "LICENSE")));
  }
  for (const unwanted of ["src", "tests", "examples", "scripts", ".env", ".git"]) {
    assert.ok(!existsSync(join(installed, unwanted)), `Source-only path leaked: ${unwanted}`);
  }

  const javascriptPaths = actualPaths.filter(path => path.startsWith("dist/") && path.endsWith(".js"));
  assert.ok(javascriptPaths.length > 0, "No compiled JavaScript to inspect");
  for (const javascriptPath of javascriptPaths) {
    const mapPath = `${javascriptPath}.map`;
    assert.ok(actualPaths.includes(mapPath), `Missing source map: ${mapPath}`);
    const javascript = readFileSync(join(installed, javascriptPath), "utf8");
    assert.ok(javascript.includes(`//# sourceMappingURL=${mapPath.split("/").at(-1)}`),
      `JavaScript does not reference its source map: ${javascriptPath}`);
    const map = JSON.parse(readFileSync(join(installed, mapPath), "utf8"));
    assert.equal(map.version, 3, `Unexpected source map version: ${mapPath}`);
    assert.ok(Array.isArray(map.sources) && map.sources.length > 0, `Missing sources: ${mapPath}`);
    assert.ok(Array.isArray(map.sourcesContent), `Missing embedded source content: ${mapPath}`);
    assert.equal(map.sourcesContent.length, map.sources.length, `Incomplete source content: ${mapPath}`);
    for (const [index, source] of map.sources.entries()) {
      assert.equal(typeof source, "string", `Invalid source path: ${mapPath}`);
      assert.ok(source.startsWith("../src/"), `Unexpected source path: ${mapPath}`);
      const embedded = map.sourcesContent[index];
      assert.equal(typeof embedded, "string", `Missing embedded source: ${mapPath}`);
      assert.ok(embedded.length > 0, `Empty embedded source: ${mapPath}`);
      const original = resolve(dirname(join(root, mapPath)), source);
      assert.equal(embedded, readFileSync(original, "utf8"), `Embedded source differs from checkout: ${mapPath}`);
    }
  }

  const runtime = [
    'import assert from "node:assert/strict";',
    'import { fileURLToPath } from "node:url";',
    'import { resolve } from "node:path";',
    'import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "payload-watch";',
    'assert.equal(fileURLToPath(import.meta.resolve("payload-watch")), resolve("node_modules/payload-watch/dist/index.js"));',
    'const changes = comparePayloads({ customer: { id: 1 }, items: [1] }, { customer: { id: "1" }, items: [1, 2] }).changes;',
    'assert.deepEqual(changes.map(x => [x.kind, x.path]), [["type-changed", "/customer/id"], ["added", "/items/1"]]);',
    'assert.match(formatComparisonReport({ changes }), /^2 changes detected:/);',
    'assert.equal(comparePayloads(null, null).changes.length, 0);',
    'const withValues = comparePayloads({ token: "old" }, { token: "new" }, { includeValues: true });',
    'assert.ok(!formatComparisonReport(withValues).includes("old"));',
    'assert.match(formatComparisonReport(withValues, { includeValues: true }), /old/);',
    'assert.throws(() => comparePayloads({ n: Number.NaN }, { n: 1 }), error => error instanceof InvalidJsonInputError && error.path === "/n");',
    'console.log("External ESM runtime imports: passed");',
  ].join("\n");
  writeFileSync(join(consumer, "consumer.mjs"), `${runtime}\n`);
  run(process.execPath, ["consumer.mjs"], consumer);

  const typed = [
    'import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "payload-watch";',
    'import type { CompareOptions, ComparisonReport, JsonValue, PayloadChange } from "payload-watch";',
    'const baseline: JsonValue = { id: 3, items: [1] };',
    'const current: JsonValue = { id: "3", items: [1] };',
    'const options: CompareOptions = { includeValues: false };',
    'const report: ComparisonReport = comparePayloads(baseline, current, options);',
    'const changes: readonly PayloadChange[] = report.changes;',
    'for (const change of changes) { if (change.kind === "type-changed") { const previous: string = change.previousType; void previous; } }',
    'const summary: string = formatComparisonReport(report);',
    'void summary; void InvalidJsonInputError;',
  ].join("\n");
  writeFileSync(join(consumer, "consumer.mts"), `${typed}\n`);
  writeFileSync(join(consumer, "consumer-bundler.ts"), `${typed}\n`);

  const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
  assert.ok(existsSync(tsc), "Run npm ci before check:consumer");
  writeFileSync(join(consumer, "tsconfig.nodenext.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext",
      strict: true, skipLibCheck: false, types: [], outDir: "./compiled",
    }, files: ["consumer.mts"],
  }, null, 2));
  run(process.execPath, [tsc, "-p", "tsconfig.nodenext.json"], consumer);
  run(process.execPath, ["compiled/consumer.mjs"], consumer);

  writeFileSync(join(consumer, "tsconfig.bundler.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "ESNext", moduleResolution: "Bundler",
      strict: true, skipLibCheck: false, types: [], noEmit: true,
    }, files: ["consumer-bundler.ts"],
  }, null, 2));
  run(process.execPath, [tsc, "-p", "tsconfig.bundler.json"], consumer);
  // Execute the literal README examples against the installed tarball.
  const readme = readFileSync(join(installed, "README.md"), "utf8");
  const snippet = (name, language) => {
    const start = `<!-- example:${name} -->\n\n\`\`\`${language}\n`;
    const body = readme.split(start)[1]?.split("\n```", 1)[0];
    assert.ok(body, `Missing README example: ${name}`);
    return `${body}\n`;
  };
  writeFileSync(join(consumer, "readme.mjs"), snippet("javascript", "js"));
  const expected = snippet("output", "text");
  assert.equal(run(process.execPath, ["readme.mjs"], consumer), expected);
  writeFileSync(join(consumer, "readme.ts"), snippet("typescript", "ts"));
  const readmeConfig = JSON.parse(snippet("tsconfig", "json"));
  writeFileSync(join(consumer, "tsconfig.readme.json"), JSON.stringify({
    ...readmeConfig, files: ["readme.ts"],
  }));
  run(process.execPath, [tsc, "-p", "tsconfig.readme.json"], consumer);
  assert.match(run(process.execPath, ["dist/readme.js"], consumer), /Type changed at \/id/);
  for (const path of actualPaths.filter(path => path.endsWith(".md"))) {
    const markdown = readFileSync(join(installed, path), "utf8");
    for (const [, target] of markdown.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)) {
      if (/^(?:[a-z]+:|#)/i.test(target)) continue;
      assert.ok(existsSync(resolve(dirname(join(installed, path)), target.split("#")[0])),
        `Documentation link is missing from installed package: ${path} -> ${target}`);
    }
  }
  console.log(`Clean consumer verified on ${process.version}; ${actualPaths.length} packaged files; NodeNext runtime + types and Bundler types passed.`);
  console.log("Installed README JavaScript, TypeScript, expected output and local links: passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
