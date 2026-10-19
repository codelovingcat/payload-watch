import { describe, expect, it } from "vitest";

describe("PayloadWatch development tooling", () => {
  it("runs a TypeScript test in the Node.js environment", () => {
    const runtimeVersion: string = process.versions.node;

    expect(runtimeVersion).toMatch(/^\d+\.\d+\.\d+/);
  });
});
