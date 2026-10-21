/**
 * PayloadWatch public API and type exports.
 *
 * Index-based array comparison and runtime input validation are tracked in
 * separate implementation issues.
 */
export { comparePayloads } from "./compare.js";
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
