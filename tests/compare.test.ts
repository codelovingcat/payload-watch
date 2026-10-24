import { describe, expect, it } from "vitest";
import { comparePayloads } from "../src/index.js";

describe("comparePayloads", () => {
  it("returns no changes for equal primitive values", () => {
    expect(comparePayloads("ready", "ready")).toEqual({ changes: [] });
    expect(comparePayloads(42, 42)).toEqual({ changes: [] });
    expect(comparePayloads(null, null)).toEqual({ changes: [] });
  });

  it("returns no changes for equivalent objects regardless of insertion order", () => {
    const previous = { status: "ready", customer: { id: 7, active: true } };
    const current = { customer: { active: true, id: 7 }, status: "ready" };

    expect(comparePayloads(previous, current)).toEqual({ changes: [] });
  });

  it("reports a primitive value change without including values by default", () => {
    expect(comparePayloads("ready", "pending")).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "",
          previousType: "string",
          currentType: "string",
        },
      ],
    });
  });

  it("includes before and after primitive values only when requested", () => {
    expect(comparePayloads(10, 12, { includeValues: true })).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "",
          previousType: "number",
          currentType: "number",
          values: { previous: 10, current: 12 },
        },
      ],
    });
  });

  it("reports added and removed object properties with their types", () => {
    expect(
      comparePayloads(
        { keep: true, removed: 3 },
        { added: "new", keep: true },
      ),
    ).toEqual({
      changes: [
        {
          kind: "added",
          path: "/added",
          currentType: "string",
        },
        {
          kind: "removed",
          path: "/removed",
          previousType: "number",
        },
      ],
    });
  });

  it("includes added and removed values only when requested", () => {
    expect(
      comparePayloads(
        { removed: { id: 4 } },
        { added: [1, 2] },
        { includeValues: true },
      ),
    ).toEqual({
      changes: [
        {
          kind: "added",
          path: "/added",
          currentType: "array",
          values: { current: [1, 2] },
        },
        {
          kind: "removed",
          path: "/removed",
          previousType: "object",
          values: { previous: { id: 4 } },
        },
      ],
    });
  });

  it("recurses into nested objects and reports the precise path", () => {
    expect(
      comparePayloads(
        { customer: { profile: { name: "Deniz" } } },
        { customer: { profile: { name: "Ece" } } },
        { includeValues: true },
      ),
    ).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "/customer/profile/name",
          previousType: "string",
          currentType: "string",
          values: { previous: "Deniz", current: "Ece" },
        },
      ],
    });
  });

  it("reports JSON type changes instead of reporting descendants too", () => {
    expect(
      comparePayloads(
        { customer: { id: 7, name: "Deniz" } },
        { customer: null },
      ),
    ).toEqual({
      changes: [
        {
          kind: "type-changed",
          path: "/customer",
          previousType: "object",
          currentType: "null",
        },
      ],
    });
  });

  it("detects type changes involving arrays and the root value", () => {
    expect(comparePayloads({}, [])).toEqual({
      changes: [
        {
          kind: "type-changed",
          path: "",
          previousType: "object",
          currentType: "array",
        },
      ],
    });
  });

  it("distinguishes a missing property from a property set to null", () => {
    expect(comparePayloads({}, { nickname: null })).toEqual({
      changes: [
        {
          kind: "added",
          path: "/nickname",
          currentType: "null",
        },
      ],
    });
  });

  it("escapes slash and tilde in property names using JSON Pointer rules", () => {
    expect(
      comparePayloads({ "a/b~c": "old" }, { "a/b~c": "new" }),
    ).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "/a~1b~0c",
          previousType: "string",
          currentType: "string",
        },
      ],
    });
  });

  it("returns changes in deterministic depth-first order", () => {
    const previous = {
      z: 1,
      a: { n: 1, m: 2 },
      b: 5,
    };
    const current = {
      z: 2,
      a: { n: 3, m: 4 },
      c: 6,
    };

    expect(comparePayloads(previous, current).changes.map((change) => change.path)).toEqual([
      "/a/m",
      "/a/n",
      "/b",
      "/c",
      "/z",
    ]);
  });

  it("does not mutate either input", () => {
    const previous = { nested: { value: 1 }, removed: "old" };
    const current = { nested: { value: 2 }, added: "new" };
    const previousSnapshot = structuredClone(previous);
    const currentSnapshot = structuredClone(current);

    comparePayloads(previous, current, { includeValues: true });

    expect(previous).toEqual(previousSnapshot);
    expect(current).toEqual(currentSnapshot);
  });

  it("returns detached before/after snapshots for added, removed, and type-changed containers", () => {
    const previous = {
      obsolete: { nested: { status: "old", list: [1, 2] } },
      typeChanged: { enabled: true },
    };
    const current = {
      created: [{ id: 7, tags: ["safe"] }],
      typeChanged: [1, { id: 2 }],
    };
    const previousSnapshot = structuredClone(previous);
    const currentSnapshot = structuredClone(current);

    const report = comparePayloads(previous, current, { includeValues: true });
    const expectedReport = JSON.stringify(
      comparePayloads(previous, current, { includeValues: true }),
    );

    const added = report.changes.find(
      (change) => change.kind === "added" && change.path === "/created",
    );
    const removed = report.changes.find(
      (change) => change.kind === "removed" && change.path === "/obsolete",
    );
    const typeChanged = report.changes.find(
      (change) => change.kind === "type-changed" && change.path === "/typeChanged",
    );

    expect(added?.kind).toBe("added");
    expect(removed?.kind).toBe("removed");
    expect(typeChanged?.kind).toBe("type-changed");
    if (
      added?.kind !== "added" ||
      removed?.kind !== "removed" ||
      typeChanged?.kind !== "type-changed"
    ) {
      throw new Error("Expected added, removed, and type-changed report entries");
    }

    const addedValue = added.values?.current as unknown as { id: number; tags: string[] }[];
    const removedValue = removed.values?.previous as unknown as {
      nested: { status: string; list: number[] };
    };
    const previousTypeValue = typeChanged.values?.previous as unknown as { enabled: boolean };
    const currentTypeValue = typeChanged.values?.current as unknown as (number | { id: number })[];

    expect(addedValue).not.toBe(current.created);
    expect(addedValue[0]).not.toBe(current.created[0]);
    expect(removedValue).not.toBe(previous.obsolete);
    expect(removedValue.nested).not.toBe(previous.obsolete.nested);
    expect(currentTypeValue).not.toBe(current.typeChanged);
    expect(previousTypeValue).not.toBe(previous.typeChanged);

    // Mutating report snapshots must not mutate either caller-owned payload.
    addedValue[0]!.tags.push("report-only");
    removedValue.nested.status = "report-only";
    removedValue.nested.list.push(99);
    previousTypeValue.enabled = false;
    currentTypeValue.push(99);

    expect(previous).toEqual(previousSnapshot);
    expect(current).toEqual(currentSnapshot);
    expect(JSON.stringify(comparePayloads(previous, current, { includeValues: true })))
      .toBe(expectedReport);
  });

  it("returns no changes for equal empty and populated arrays", () => {
    expect(comparePayloads([], [])).toEqual({ changes: [] });
    expect(comparePayloads([1, "two", null], [1, "two", null])).toEqual({ changes: [] });
  });

  it("reports changed array elements at their numeric indexes", () => {
    expect(comparePayloads(["ready", "old"], ["ready", "new"])).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "/1",
          previousType: "string",
          currentType: "string",
        },
      ],
    });
  });

  it("reports elements beyond the previous array length as additions", () => {
    expect(comparePayloads([1], [1, "new"])).toEqual({
      changes: [
        {
          kind: "added",
          path: "/1",
          currentType: "string",
        },
      ],
    });
  });

  it("reports elements beyond the current array length as removals", () => {
    expect(comparePayloads([1, { id: 2 }], [1])).toEqual({
      changes: [
        {
          kind: "removed",
          path: "/1",
          previousType: "object",
        },
      ],
    });
  });

  it("recurses into nested objects and arrays using index paths", () => {
    expect(
      comparePayloads(
        { users: [{ profile: { name: "Deniz" } }] },
        { users: [{ profile: { name: "Ece" } }] },
      ),
    ).toEqual({
      changes: [
        {
          kind: "value-changed",
          path: "/users/0/profile/name",
          previousType: "string",
          currentType: "string",
        },
      ],
    });
  });

  it("compares reordered items by index without inferring moves", () => {
    expect(
      comparePayloads(
        [{ id: "a" }, { id: "b" }],
        [{ id: "b" }, { id: "a" }],
      ).changes.map((change) => [change.kind, change.path]),
    ).toEqual([
      ["value-changed", "/0/id"],
      ["value-changed", "/1/id"],
    ]);
  });

  it("does not infer an insertion; it reports observable index differences", () => {
    expect(comparePayloads([10, 20], [5, 10, 20]).changes).toEqual([
      {
        kind: "value-changed",
        path: "/0",
        previousType: "number",
        currentType: "number",
      },
      {
        kind: "value-changed",
        path: "/1",
        previousType: "number",
        currentType: "number",
      },
      {
        kind: "added",
        path: "/2",
        currentType: "number",
      },
    ]);
  });

  it("includes array before/after values only when requested", () => {
    expect(comparePayloads([1], [1, 2], { includeValues: true })).toEqual({
      changes: [
        {
          kind: "added",
          path: "/1",
          currentType: "number",
          values: { current: 2 },
        },
      ],
    });
  });

  it("reports differences in nested arrays in numeric index order", () => {
    const report = comparePayloads(
      [[1, 2], [3]],
      [[1, 4], [5, 6]],
    );

    expect(report.changes.map((change) => [change.kind, change.path])).toEqual([
      ["value-changed", "/0/1"],
      ["value-changed", "/1/0"],
      ["added", "/1/1"],
    ]);
  });

});
