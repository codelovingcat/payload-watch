import { appendPointerSegment } from "./json-pointer.js";
import { escapeDisplayControls } from "./display-escape.js";

export class InvalidJsonInputError extends TypeError {
  readonly input: "previousPayload" | "currentPayload";
  readonly path: string;
  readonly reason: string;

  constructor(
    input: "previousPayload" | "currentPayload",
    path: string,
    reason: string,
  ) {
    super(escapeDisplayControls(
      "Invalid JSON input for " + input + " at JSON Pointer " +
      JSON.stringify(path) + ": " + reason + ".",
    ));
    this.name = "InvalidJsonInputError";
    this.input = input;
    this.path = path;
    this.reason = reason;
  }
}

function reject(
  input: "previousPayload" | "currentPayload",
  path: string,
  reason: string,
): never {
  throw new InvalidJsonInputError(input, path, reason);
}

function inspectOwnKeys(
  value: object,
  input: "previousPayload" | "currentPayload",
  path: string,
): (string | symbol)[] {
  try {
    return Reflect.ownKeys(value);
  } catch {
    return reject(input, path, "object properties could not be inspected safely");
  }
}

function inspectOwnProperty(
  value: object,
  key: string,
  input: "previousPayload" | "currentPayload",
  path: string,
): PropertyDescriptor | undefined {
  try {
    return Object.getOwnPropertyDescriptor(value, key);
  } catch {
    return reject(input, path, "object properties could not be inspected safely");
  }
}

function validateDataProperty(
  descriptor: PropertyDescriptor | undefined,
  input: "previousPayload" | "currentPayload",
  path: string,
): unknown {
  if (descriptor === undefined) {
    return reject(input, path, "the property could not be inspected safely");
  }

  if ("get" in descriptor || "set" in descriptor) {
    return reject(input, path, "accessor properties are not supported");
  }

  if (!descriptor.enumerable) {
    return reject(input, path, "non-enumerable properties are not supported");
  }

  return descriptor.value;
}

function isCanonicalArrayIndex(key: string): boolean {
  const index = Number(key);
  return Number.isInteger(index) &&
    index >= 0 &&
    index < 0xffff_ffff &&
    String(index) === key;
}

function validateArray(
  value: object,
  input: "previousPayload" | "currentPayload",
  path: string,
  ancestors: Set<object>,
): void {
  const lengthDescriptor = inspectOwnProperty(value, "length", input, path);
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    reject(input, path, "the array length could not be inspected safely");
  }

  const length = lengthDescriptor.value;
  const keys = inspectOwnKeys(value, input, path);
  const indexes: { index: number; key: string }[] = [];

  for (const key of keys) {
    if (typeof key === "symbol") {
      reject(input, path, "symbol-keyed properties are not supported");
    }

    if (key === "length") {
      continue;
    }

    if (!isCanonicalArrayIndex(key)) {
      reject(
        input,
        path,
        "arrays may contain only dense numeric indexes and cannot have extra properties",
      );
    }

    const index = Number(key);
    if (index >= length) {
      reject(input, path, "array indexes must be within the array length");
    }

    indexes.push({ index, key });
  }

  indexes.sort((left, right) => left.index - right.index);

  let expectedIndex = 0;
  for (const { index, key } of indexes) {
    if (index !== expectedIndex) {
      reject(
        input,
        appendPointerSegment(path, String(expectedIndex)),
        "sparse arrays are not supported",
      );
    }

    const propertyPath = appendPointerSegment(path, key);
    const descriptor = inspectOwnProperty(value, key, input, propertyPath);
    const element = validateDataProperty(descriptor, input, propertyPath);
    validateNode(element, input, propertyPath, ancestors);
    expectedIndex += 1;
  }

  if (expectedIndex < length) {
    reject(
      input,
      appendPointerSegment(path, String(expectedIndex)),
      "sparse arrays are not supported",
    );
  }
}

function validatePlainObject(
  value: object,
  input: "previousPayload" | "currentPayload",
  path: string,
  ancestors: Set<object>,
): void {
  const keys = inspectOwnKeys(value, input, path);

  for (const key of keys) {
    if (typeof key === "symbol") {
      reject(input, path, "symbol-keyed properties are not supported");
    }

    const propertyPath = appendPointerSegment(path, key);
    const descriptor = inspectOwnProperty(value, key, input, propertyPath);
    const propertyValue = validateDataProperty(descriptor, input, propertyPath);
    validateNode(propertyValue, input, propertyPath, ancestors);
  }
}

function validateNode(
  value: unknown,
  input: "previousPayload" | "currentPayload",
  path: string,
  ancestors: Set<object>,
): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      reject(input, path, "numbers must be finite; NaN and infinities are not JSON values");
    }
    return;
  }

  if (typeof value === "undefined") {
    reject(input, path, "undefined is not a JSON value");
  }

  if (typeof value === "function") {
    reject(input, path, "functions are not JSON values");
  }

  if (typeof value === "symbol") {
    reject(input, path, "symbols are not JSON values");
  }

  if (typeof value === "bigint") {
    reject(input, path, "bigint values are not JSON values");
  }

  if (typeof value !== "object") {
    reject(input, path, "the value is not a supported JSON value");
  }

  if (ancestors.has(value)) {
    reject(input, path, "circular references are not supported");
  }

  ancestors.add(value);
  try {
    let isArray: boolean;
    let prototype: object | null;

    try {
      isArray = Array.isArray(value);
      prototype = Object.getPrototypeOf(value) as object | null;
    } catch {
      reject(input, path, "the object could not be inspected safely");
    }

    if (isArray) {
      if (prototype !== Array.prototype) {
        reject(input, path, "arrays with custom prototypes are not supported");
      }
      validateArray(value, input, path, ancestors);
      return;
    }

    if (prototype !== Object.prototype && prototype !== null) {
      reject(
        input,
        path,
        "only plain objects are supported; Date, RegExp, Map, Set, and class instances are not JSON values",
      );
    }

    validatePlainObject(value, input, path, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Reject values that cannot be represented by the documented JSON input
 * contract. Validation uses property descriptors so getters are not executed.
 */
export function assertJsonValue(
  value: unknown,
  input: "previousPayload" | "currentPayload",
): asserts value is import("./json-value.js").JsonValue {
  validateNode(value, input, "", new Set<object>());
}
