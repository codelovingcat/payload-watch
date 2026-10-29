import { describe, expect, it } from "vitest";
import { InvalidJsonInputError, comparePayloads } from "../src/index.js";
import type { JsonValue } from "../src/index.js";

function compareUnknown(previous: unknown, current: unknown) {
  return comparePayloads(previous as JsonValue, current as JsonValue);
}

function expectInvalidInput(
  action: () => unknown,
  expected: {
    input: "previousPayload" | "currentPayload";
    path: string;
    reasonIncludes?: string;
  },
): InvalidJsonInputError {
  let caught: unknown;

  try {
    action();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(InvalidJsonInputError);
  if (!(caught instanceof InvalidJsonInputError)) {
    throw new Error("Expected comparePayloads to throw InvalidJsonInputError");
  }

  expect(caught).toBeInstanceOf(TypeError);
  expect(caught.input).toBe(expected.input);
  expect(caught.path).toBe(expected.path);
  if (expected.reasonIncludes !== undefined) {
    expect(caught.reason).toContain(expected.reasonIncludes);
  }

  return caught;
}

describe("runtime JSON input validation", () => {
  it("rejects unsupported primitive values with a typed error", () => {
    const unsupported: [string, unknown, string][] = [
      ["undefined", undefined, "undefined"],
      ["function", () => "should not be called", "functions"],
      ["symbol", Symbol("secret-symbol"), "symbols"],
      ["bigint", 1n, "bigint"],
      ["NaN", Number.NaN, "finite"],
      ["positive infinity", Number.POSITIVE_INFINITY, "finite"],
      ["negative infinity", Number.NEGATIVE_INFINITY, "finite"],
    ];

    for (const [label, value, reason] of unsupported) {
      const error = expectInvalidInput(
        () => compareUnknown(null, value),
        { input: "currentPayload", path: "", reasonIncludes: reason },
      );

      expect(error.message).toContain('JSON Pointer ""');
      expect(error.message).not.toContain("secret-symbol");
      expect(error.message).not.toContain(label === "function" ? "should not be called" : "unused");
    }
  });

  it("validates the previous input as well as the current input", () => {
    expectInvalidInput(
      () => compareUnknown({ amount: Number.NaN }, {}),
      { input: "previousPayload", path: "/amount", reasonIncludes: "finite" },
    );
  });

  it("reports a nested JSON Pointer path without including payload values", () => {
    const current = {
      users: [
        { profile: { active: true } },
        { profile: { token: "private-token-value", limit: Number.NaN } },
      ],
    };

    const error = expectInvalidInput(
      () => compareUnknown({}, current),
      { input: "currentPayload", path: "/users/1/profile/limit", reasonIncludes: "finite" },
    );

    expect(error.message).not.toContain("private-token-value");
    expect(error.stack).not.toContain("private-token-value");
    expect(error.message).not.toContain(JSON.stringify(current));
    expect(error.message).toContain('JSON Pointer "/users/1/profile/limit"');
  });

  it("rejects dates, regular expressions, maps, sets, and class instances", () => {
    class Customer {
      id = 7;
    }

    const unsupportedObjects: [string, unknown][] = [
      ["Date", new Date("2024-01-01T00:00:00.000Z")],
      ["RegExp", /ready/],
      ["Map", new Map([["id", 7]])],
      ["Set", new Set([7])],
      ["class instance", new Customer()],
    ];

    for (const [label, value] of unsupportedObjects) {
      const error = expectInvalidInput(
        () => compareUnknown(value, null),
        {
          input: "previousPayload",
          path: "",
          reasonIncludes: "plain objects",
        },
      );
      expect(error.message).not.toContain(label === "class instance" ? "Customer" : "unused");
    }
  });

  it("rejects sparse arrays and identifies the first missing index", () => {
    const sparse: unknown[] = [1, , 3];

    expectInvalidInput(
      () => compareUnknown(null, sparse),
      {
        input: "currentPayload",
        path: "/1",
        reasonIncludes: "sparse arrays",
      },
    );
  });

  it("rejects array subclasses and extra non-index properties", () => {
    class CustomArray extends Array<number> {}
    const subclass = new CustomArray(1, 2);

    expectInvalidInput(
      () => compareUnknown(subclass, []),
      {
        input: "previousPayload",
        path: "",
        reasonIncludes: "custom prototypes",
      },
    );

    const withExtraProperty: number[] & { note?: string } = [1, 2];
    withExtraProperty.note = "not JSON array data";

    expectInvalidInput(
      () => compareUnknown(withExtraProperty, []),
      {
        input: "previousPayload",
        path: "",
        reasonIncludes: "extra properties",
      },
    );
  });

  it("rejects circular references at the path where the cycle is found", () => {
    const circular: { child?: unknown } = {};
    circular.child = circular;

    expectInvalidInput(
      () => compareUnknown({}, circular),
      {
        input: "currentPayload",
        path: "/child",
        reasonIncludes: "circular references",
      },
    );
  });

  it("rejects accessors without executing getters", () => {
    let getterCalls = 0;
    const payload = {};

    Object.defineProperty(payload, "secret", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "private-getter-value";
      },
    });

    const error = expectInvalidInput(
      () => compareUnknown(payload, {}),
      {
        input: "previousPayload",
        path: "/secret",
        reasonIncludes: "accessor properties",
      },
    );

    expect(getterCalls).toBe(0);
    expect(error.message).not.toContain("private-getter-value");
  });

  it("rejects symbol keys and non-enumerable properties", () => {
    const symbolKeyed = { visible: true, [Symbol("private")]: false };

    expectInvalidInput(
      () => compareUnknown(symbolKeyed, {}),
      {
        input: "previousPayload",
        path: "",
        reasonIncludes: "symbol-keyed properties",
      },
    );

    const hidden = { visible: true };
    Object.defineProperty(hidden, "private", {
      value: "private-hidden-value",
      enumerable: false,
    });

    const error = expectInvalidInput(
      () => compareUnknown(hidden, {}),
      {
        input: "previousPayload",
        path: "/private",
        reasonIncludes: "non-enumerable",
      },
    );

    expect(error.message).not.toContain("private-hidden-value");
  });

  it("accepts null-prototype records, frozen data properties, and shared non-circular values", () => {
    const nullPrototype = Object.create(null) as Record<string, JsonValue>;
    nullPrototype.answer = 42;

    const child = { id: 7 };
    const shared = { left: child, right: child };
    const equivalent = { left: { id: 7 }, right: { id: 7 } };
    const frozen = Object.freeze({ answer: 42 });

    expect(compareUnknown(nullPrototype, { answer: 42 })).toEqual({ changes: [] });
    expect(compareUnknown(shared, equivalent)).toEqual({ changes: [] });
    expect(compareUnknown(frozen, { answer: 42 })).toEqual({ changes: [] });
  });
});
