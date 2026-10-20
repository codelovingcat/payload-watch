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

/**
 * Optional before/after data for a reported change.
 *
 * Values are omitted from reports by default to reduce accidental exposure of
 * sensitive API data. They are included only when the caller opts in through
 * the comparison options.
 */
export type ChangeValues =
  | {
      readonly current: JsonValue;
      readonly previous?: never;
    }
  | {
      readonly previous: JsonValue;
      readonly current?: never;
    }
  | {
      readonly previous: JsonValue;
      readonly current: JsonValue;
    };

/** Common fields for every reported difference. */
export interface ChangeBase {
  /** The category of change. */
  readonly kind: ChangeKind;

  /**
   * JSON Pointer to the affected value.
   * An empty string denotes the root JSON value.
   */
  readonly path: JsonPointer;

  /**
   * Present only when value inclusion is explicitly enabled.
   * This contains values for the affected node, not the entire input payload.
   */
  readonly values?: ChangeValues;
}

/** A value exists at this location only in the current payload. */
export interface AddedChange extends ChangeBase {
  readonly kind: "added";
  readonly currentType: JsonValueType;
}

/** A value exists at this location only in the previous payload. */
export interface RemovedChange extends ChangeBase {
  readonly kind: "removed";
  readonly previousType: JsonValueType;
}

/** A primitive value changed while retaining the same JSON type. */
export interface ValueChangedChange extends ChangeBase {
  readonly kind: "value-changed";
  readonly previousType: JsonValueType;
  readonly currentType: JsonValueType;
}

/**
 * A value changed from one JSON type to a different JSON type.
 * The change is reported at this location instead of recursively reporting
 * every descendant of the replaced value.
 */
export interface TypeChangedChange extends ChangeBase {
  readonly kind: "type-changed";
  readonly previousType: JsonValueType;
  readonly currentType: JsonValueType;
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
}

/** The structured result shape returned by a comparison. */
export interface ComparisonReport {
  /** Changes in deterministic traversal order; empty means no differences. */
  readonly changes: readonly PayloadChange[];
}
