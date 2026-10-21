import type {
  AddedChange,
  CompareOptions,
  ComparisonReport,
  JsonValueType,
  PayloadChange,
  RemovedChange,
  TypeChangedChange,
  ValueChangedChange,
} from "./change-model.js";
import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./json-value.js";

function getJsonValueType(value: JsonValue): JsonValueType {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (typeof value === "object") {
    return "object";
  }

  if (typeof value === "string") {
    return "string";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  // The public type prevents this branch for valid TypeScript callers.
  // Runtime rejection of unsupported JavaScript values is handled separately.
  return "object";
}

function appendPointerSegment(parentPath: string, key: string): string {
  const escapedKey = key.replace(/~/g, "~0").replace(/\//g, "~1");
  return parentPath + "/" + escapedKey;
}

function hasOwn(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function createAddedChange(
  path: string,
  currentValue: JsonValue,
  includeValues: boolean,
): AddedChange {
  return {
    kind: "added",
    path,
    currentType: getJsonValueType(currentValue),
    ...(includeValues ? { values: { current: currentValue } } : {}),
  };
}

function createRemovedChange(
  path: string,
  previousValue: JsonValue,
  includeValues: boolean,
): RemovedChange {
  return {
    kind: "removed",
    path,
    previousType: getJsonValueType(previousValue),
    ...(includeValues ? { values: { previous: previousValue } } : {}),
  };
}

function compareNode(
  previousValue: JsonValue,
  currentValue: JsonValue,
  path: string,
  includeValues: boolean,
  changes: PayloadChange[],
): void {
  const previousType = getJsonValueType(previousValue);
  const currentType = getJsonValueType(currentValue);

  if (previousType !== currentType) {
    const change: TypeChangedChange = {
      kind: "type-changed",
      path,
      previousType,
      currentType,
      ...(includeValues
        ? { values: { previous: previousValue, current: currentValue } }
        : {}),
    };
    changes.push(change);
    return;
  }

  if (previousType === "object" && currentType === "object") {
    compareObjects(
      previousValue as JsonObject,
      currentValue as JsonObject,
      path,
      includeValues,
      changes,
    );
    return;
  }

  if (previousType === "array" && currentType === "array") {
    compareArrays(
      previousValue as JsonArray,
      currentValue as JsonArray,
      path,
      includeValues,
      changes,
    );
    return;
  }

  // Matching non-array JSON types at this point are primitive values.
  if (previousValue !== currentValue) {
    const change: ValueChangedChange = {
      kind: "value-changed",
      path,
      previousType,
      currentType,
      ...(includeValues
        ? {
            values: {
              previous: previousValue as JsonPrimitive,
              current: currentValue as JsonPrimitive,
            },
          }
        : {}),
    };
    changes.push(change);
  }
}

function compareObjects(
  previousObject: JsonObject,
  currentObject: JsonObject,
  path: string,
  includeValues: boolean,
  changes: PayloadChange[],
): void {
  const keys = [...new Set([...Object.keys(previousObject), ...Object.keys(currentObject)])];
  keys.sort();

  for (const key of keys) {
    const previousHasKey = hasOwn(previousObject, key);
    const currentHasKey = hasOwn(currentObject, key);
    const childPath = appendPointerSegment(path, key);

    if (!previousHasKey) {
      changes.push(createAddedChange(childPath, currentObject[key]!, includeValues));
      continue;
    }

    if (!currentHasKey) {
      changes.push(createRemovedChange(childPath, previousObject[key]!, includeValues));
      continue;
    }

    compareNode(
      previousObject[key]!,
      currentObject[key]!,
      childPath,
      includeValues,
      changes,
    );
  }
}


function compareArrays(
  previousArray: JsonArray,
  currentArray: JsonArray,
  path: string,
  includeValues: boolean,
  changes: PayloadChange[],
): void {
  const longestLength = Math.max(previousArray.length, currentArray.length);

  for (let index = 0; index < longestLength; index += 1) {
    const childPath = appendPointerSegment(path, String(index));
    const previousHasIndex = index < previousArray.length;
    const currentHasIndex = index < currentArray.length;

    if (!previousHasIndex) {
      changes.push(createAddedChange(childPath, currentArray[index]!, includeValues));
      continue;
    }

    if (!currentHasIndex) {
      changes.push(createRemovedChange(childPath, previousArray[index]!, includeValues));
      continue;
    }

    compareNode(
      previousArray[index]!,
      currentArray[index]!,
      childPath,
      includeValues,
      changes,
    );
  }
}

/**
 * Compare two JSON values and return their observable differences.
 *
 * Object keys are visited in ascending JavaScript string sort order. Paths use
 * RFC 6901 JSON Pointer escaping. Before/after values are omitted unless
 * includeValues is explicitly set to true.
 *
 * Arrays are ordered sequences and are compared by numeric index. The engine
 * does not infer moves or match array objects by identity. A transition between
 * an array and another JSON type is reported as a type change at that path.
 */
export function comparePayloads(
  previousPayload: JsonValue,
  currentPayload: JsonValue,
  options: CompareOptions = {},
): ComparisonReport {
  const changes: PayloadChange[] = [];
  const includeValues = options.includeValues === true;

  compareNode(previousPayload, currentPayload, "", includeValues, changes);

  return { changes };
}
