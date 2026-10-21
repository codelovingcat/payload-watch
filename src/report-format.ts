import type {
  ComparisonReport,
  FormatOptions,
  PayloadChange,
} from "./change-model.js";
import type { JsonValue } from "./json-value.js";

function formatPath(path: string): string {
  return path === "" ? "<root>" : path;
}

/**
 * Render JSON values as compact JSON with recursively sorted object keys.
 * This keeps opt-in value output stable for equivalent object values.
 */
function formatJsonValue(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatJsonValue(item)).join(", ")}]`;
  }

  if (typeof value === "object") {
    const object = value as Readonly<Record<string, JsonValue>>;
    const entries = Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}: ${formatJsonValue(object[key]!)}`);

    return `{${entries.join(", ")}}`;
  }

  return JSON.stringify(value) ?? String(value);
}

function formatChange(change: PayloadChange, includeValues: boolean): string {
  const path = formatPath(change.path);

  switch (change.kind) {
    case "added": {
      const values = includeValues && change.values
        ? ` — <missing> → ${formatJsonValue(change.values.current)}`
        : "";
      return `Added value at ${path} (current type: ${change.currentType})${values}`;
    }

    case "removed": {
      const values = includeValues && change.values
        ? `${formatJsonValue(change.values.previous)} → <missing>`
        : "";
      return `Removed value at ${path} (previous type: ${change.previousType})${values ? ` — ${values}` : ""}`;
    }

    case "value-changed": {
      const values = includeValues && change.values
        ? ` — ${formatJsonValue(change.values.previous)} → ${formatJsonValue(change.values.current)}`
        : "";
      return `Value changed at ${path} (type: ${change.previousType})${values}`;
    }

    case "type-changed": {
      const values = includeValues && change.values
        ? ` — ${formatJsonValue(change.values.previous)} → ${formatJsonValue(change.values.current)}`
        : "";
      return `Type changed at ${path} (${change.previousType} → ${change.currentType})${values}`;
    }
  }
}

/**
 * Format a structured report as a concise, deterministic summary.
 * This function returns text only; it never logs or transmits the report.
 * Values are omitted by default, even when the report contains opt-in values.
 */
export function formatComparisonReport(
  report: ComparisonReport,
  options: FormatOptions = {},
): string {
  if (report.changes.length === 0) {
    return "No changes detected.";
  }

  const count = report.changes.length;
  const noun = count === 1 ? "change" : "changes";
  const lines = report.changes.map(
    (change, index) => `${index + 1}. ${formatChange(change, options.includeValues === true)}`,
  );

  return `${count} ${noun} detected:\n${lines.join("\n")}`;
}
