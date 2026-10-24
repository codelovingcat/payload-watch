/**
 * A JSON primitive value.
 *
 * Note: TypeScript's `number` type also permits NaN and infinities.
 * PayloadWatch's runtime input validation rejects non-finite numbers.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * A JSON-compatible array.
 *
 * Readonly types express that PayloadWatch consumes inputs and never mutates
 * them. Ordinary mutable arrays are still assignable to this type.
 */
export type JsonArray = readonly JsonValue[];

/**
 * A JSON-compatible object whose property values are JSON values.
 *
 * Ordinary object literals and objects returned by JSON.parse() are accepted
 * by this type. Runtime validation defines which JavaScript objects are
 * valid inputs more precisely.
 */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/**
 * A recursive JSON value accepted by PayloadWatch.
 *
 * A root input may be an object, array, string, finite number, boolean, or
 * null. Runtime-only constraints (such as excluding circular references) are
 * documented in docs/json-input-contract.md and enforced by the
 * runtime validator.
 */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
