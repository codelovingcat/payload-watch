/**
 * PayloadWatch public type exports.
 *
 * Runtime comparison behavior will be added with the comparison-engine work
 * after the public input and change models are agreed.
 */
export type {
  AddedChange,
  ChangeBase,
  ChangeKind,
  CompareOptions,
  ComparisonReport,
  JsonPointer,
  JsonValueType,
  PayloadChange,
  RemovedChange,
  TypeChangedChange,
  ValueChangedChange,
} from "./change-model.js";

export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./json-value.js";
