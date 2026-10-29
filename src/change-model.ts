import type { JsonPrimitive, JsonValue } from "./json-value.js";

/**
 * JSON Pointer path to the value where a change was observed.
 *
 * The empty string ("") represents the root value. Other pointers use RFC 6901
 * escaping: "~" becomes "~0", then "/" becomes "~1" within each object key.
 */
export type JsonPointer = string;

/** The JSON data-model type observed at a location. */
export type JsonValueType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

/** The categories of differences reported by PayloadWatch. */
export type ChangeKind =
  | "added"
  | "removed"
  | "value-changed"
  | "type-changed";

/** Common fields for every reported difference. */
export interface ChangeBase<TKind extends ChangeKind = ChangeKind> {
  /** The category of change. */
  readonly kind: TKind;

  /**
   * JSON Pointer to the affected value.
   * An empty string denotes the root JSON value.
   */
  readonly path: JsonPointer;
}

/**
 * A value exists at this location only in the current payload.
 * Before/after data is absent by default and is opt-in through CompareOptions.
 */
export interface AddedChange extends ChangeBase<"added"> {
  readonly currentType: JsonValueType;
  readonly values?: {
    readonly current: JsonValue;
  };
}

/**
 * A value exists at this location only in the previous payload.
 * Before/after data is absent by default and is opt-in through CompareOptions.
 */
export interface RemovedChange extends ChangeBase<"removed"> {
  readonly previousType: JsonValueType;
  readonly values?: {
    readonly previous: JsonValue;
  };
}

/**
 * A primitive value changed while retaining the same JSON type.
 * Values are available only when the caller explicitly opts in.
 */
export interface ValueChangedChange extends ChangeBase<"value-changed"> {
  readonly previousType: JsonValueType;
  readonly currentType: JsonValueType;
  readonly values?: {
    readonly previous: JsonPrimitive;
    readonly current: JsonPrimitive;
  };
}

/**
 * A value changed from one JSON type to a different JSON type.
 * The change is reported at this location instead of recursively reporting
 * every descendant of the replaced value. Values are opt-in.
 */
export interface TypeChangedChange extends ChangeBase<"type-changed"> {
  readonly previousType: JsonValueType;
  readonly currentType: JsonValueType;
  readonly values?: {
    readonly previous: JsonValue;
    readonly current: JsonValue;
  };
}

/** A discriminated union of all supported change records. */
export type PayloadChange =
  | AddedChange
  | RemovedChange
  | ValueChangedChange
  | TypeChangedChange;

/** Options that affect the content of a comparison report. */
export interface CompareOptions {
  /**
   * Include before/after values for changed locations.
   *
   * Defaults to false because API responses may contain personal or otherwise
   * sensitive information. Enabling this option does not log or transmit data.
   */
  readonly includeValues?: boolean;
  /** Exact RFC 6901 paths whose entire subtrees are omitted from changes. */
  readonly ignorePaths?: readonly JsonPointer[];
}

/** Options for formatting a structured report as readable text. */
export interface FormatOptions {
  /**
   * Include before/after values in the summary when present in the report.
   * Defaults to false as a second safeguard against accidental exposure.
   */
  readonly includeValues?: boolean;
}

/** The structured result shape returned by a comparison. */
export interface ComparisonReport {
  /** Changes in deterministic traversal order; empty means no differences. */
  readonly changes: readonly PayloadChange[];
}
