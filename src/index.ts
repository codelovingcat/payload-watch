/**
 * PayloadWatch public API and type exports.
 *
 * Unsupported runtime inputs are rejected with InvalidJsonInputError.
 */
export { comparePayloads } from "./compare.js";
export { InvalidJsonInputError } from "./json-input-validation.js";
export { formatComparisonReport } from "./report-format.js";
export type {
  AddedChange,
  ChangeBase,
  ChangeKind,
  CompareOptions,
  ComparisonReport,
  FormatOptions,
  JsonPointer,
  JsonValueType,
  PayloadChange,
  RemovedChange,
  TypeChangedChange,
  ValueChangedChange,
} from "./change-model.js";

export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./json-value.js";
