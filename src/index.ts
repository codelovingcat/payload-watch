/**
 * PayloadWatch public API and type exports.
 *
 * Runtime input validation is tracked in a separate implementation issue.
 */
export { comparePayloads } from "./compare.js";
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
