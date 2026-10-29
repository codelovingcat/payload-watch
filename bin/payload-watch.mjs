#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { comparePayloads, formatComparisonReport, InvalidJsonInputError } from "../dist/index.js";

const USAGE = "Usage: payload-watch compare <previous.json> <current.json>";

function fail(message) {
  process.stderr.write("payload-watch: " + message + "\n");
  process.exitCode = 2;
}

async function loadJson(file, label) {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "IO_ERROR";
    throw new Error("Cannot read " + label + " file (" + code + ")");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON in " + label + " file");
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    process.stdout.write(USAGE + "\n");
    return;
  }
  if (argv.length !== 3 || argv[0] !== "compare" || argv.slice(1).some((s) => s.startsWith("--"))) {
    fail(USAGE);
    return;
  }
  try {
    const previous = await loadJson(argv[1], "previous");
    const current = await loadJson(argv[2], "current");
    const report = comparePayloads(previous, current);
    process.stdout.write(formatComparisonReport(report) + "\n");
  } catch (error) {
    if (error instanceof InvalidJsonInputError) {
      fail("Invalid " + error.input + " at " + JSON.stringify(error.path) + ": " + error.reason);
    } else {
      fail(error instanceof Error ? error.message : "Unable to compare files");
    }
  }
}

await main();
