import { describe, expect, test } from "vitest";

describe("Vitest Setup", () => {
  test("should run basic test", () => {
    expect(1 + 1).toBe(2);
  });

  test("should have test environment", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });

  test("should be able to use expect matchers", () => {
    expect("hello world").toContain("world");
    expect([1, 2, 3]).toHaveLength(3);
  });
});
