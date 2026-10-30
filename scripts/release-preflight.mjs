import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Metadata-only check. This can never authorize an npm publication. */
export function inspectReleaseMetadata(pkg, lock, files) {
  const blockers = [];
  if (pkg.private !== false) blockers.push("Package remains private");
  if (pkg.publishConfig?.access !== "public" || pkg.publishConfig?.registry !== "https://registry.npmjs.org/") {
    blockers.push("Public npm registry/access configuration is missing or unexpected");
  }
  if (pkg.scripts?.prepack !== "npm run build" || pkg.scripts?.prepublishOnly !== "npm run release:verify") {
    blockers.push("Build and validation lifecycle guards are missing");
  }
  if (pkg.version === "0.0.0" || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version ?? "")) {
    blockers.push("Deliberate release version is missing");
  }
  if (typeof pkg.name !== "string" || !pkg.name) blockers.push("npm name is not defined");
  if (!pkg.license || !files.has("LICENSE")) blockers.push("License metadata or LICENSE is missing");
  if (!files.has("CHANGELOG.md")) blockers.push("CHANGELOG.md is missing");
  if (!files.has("README.md")) blockers.push("README.md is missing");
  if (!files.has("docs/versioning-policy.md")) blockers.push("Versioning policy is missing");
  if (!files.has("docs/package-entrypoints.md")) blockers.push("Entry-point documentation is missing");
  if (!files.has("docs/consumer-installation.md")) blockers.push("Consumer validation documentation is missing");
  if (pkg.type !== "module" || pkg.main !== "./dist/index.js" ||
      pkg.types !== "./dist/index.d.ts" ||
      pkg.exports?.["."]?.import !== "./dist/index.js" ||
      pkg.exports?.["."]?.types !== "./dist/index.d.ts") {
    blockers.push("Package export/type contract has changed");
  }
  if (!lock || lock.version !== pkg.version || lock.packages?.[""]?.version !== pkg.version) {
    blockers.push("Lockfile version and package version do not match");
  }
  return blockers;
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === self) {
  const root = resolve(dirname(self), "..");
  const names = ["LICENSE", "CHANGELOG.md", "README.md", "docs/versioning-policy.md",
    "docs/package-entrypoints.md", "docs/consumer-installation.md"];
  const files = new Set(names.filter(name => existsSync(join(root, name))));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const lock = existsSync(join(root, "package-lock.json"))
    ? JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"))
    : null;
  const blockers = inspectReleaseMetadata(pkg, lock, files);
  process.stdout.write("PayloadWatch release metadata preflight\n");
  if (blockers.length) {
    for (const blocker of blockers) process.stdout.write("BLOCKED: " + blocker + "\n");
    process.stdout.write("Package was not published. See docs/first-release-checklist.md.\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("Static metadata passed. npm ownership, CI, archive security and approval STILL require manual verification.\n");
  }
}
