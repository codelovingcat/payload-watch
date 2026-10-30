#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { TextDecoder } from "node:util";
import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "../dist/index.js";

const USAGE = "Usage: payload-watch compare [--format text|json] [--fail-on-change] <previous.json> <current.json>";
function fail(message) {
  process.stderr.write("payload-watch: " + message + "\n");
  process.exitCode = 2;
}
function parse(argv) {
  if ((argv.length === 1 && ["--help", "-h"].includes(argv[0])) ||
      (argv.length === 2 && argv[0] === "compare" && ["--help", "-h"].includes(argv[1]))) {
    return { help: true };
  }
  if (argv[0] !== "compare") throw new Error(USAGE);
  const paths = [];
  let format = "text";
  let seenFormat = false;
  let failOnChange = false;
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--format" || token.startsWith("--format=")) {
      if (seenFormat) throw new Error("Specify --format only once");
      seenFormat = true;
      const mode = token === "--format" ? argv[++i] : token.slice("--format=".length);
      if (mode !== "text" && mode !== "json") throw new Error("--format must be text or json");
      format = mode;
    } else if (token === "--fail-on-change") {
      if (failOnChange) throw new Error("Specify --fail-on-change only once");
      failOnChange = true;
    } else if (token.startsWith("-")) {
      throw new Error("Unknown option: " + token);
    } else {
      paths.push(token);
    }
  }
  if (paths.length !== 2) throw new Error(USAGE);
  return { format, failOnChange, paths };
}
async function loadJson(path, label) {
  let bytes;
  try {
    bytes = await readFile(path);
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "IO_ERROR";
    throw new Error("Cannot read " + label + " file (" + code + ")");
  }
  let text;
  try {
    // Fatal decoding rejects malformed UTF-8. The default BOM handling consumes
    // one leading UTF-8 BOM without removing U+FEFF inside JSON strings.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Invalid UTF-8 in " + label + " file");
  }
  try { return JSON.parse(text); }
  catch { throw new Error("Invalid JSON in " + label + " file"); }
}
export async function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parse(argv); }
  catch (error) { fail(error.message); return; }
  if (args.help) { process.stdout.write(USAGE + "\n"); return; }
  try {
    const previous = await loadJson(args.paths[0], "previous");
    const current = await loadJson(args.paths[1], "current");
    const report = comparePayloads(previous, current);
    process.stdout.write(args.format === "json"
      ? JSON.stringify(report) + "\n"
      : formatComparisonReport(report) + "\n");
    if (args.failOnChange && report.changes.length > 0) process.exitCode = 1;
  } catch (error) {
    if (error instanceof InvalidJsonInputError) {
      fail("Invalid " + error.input + " at " + JSON.stringify(error.path) + ": " + error.reason);
    } else fail(error instanceof Error ? error.message : "Unable to compare files");
  }
}
await main();
