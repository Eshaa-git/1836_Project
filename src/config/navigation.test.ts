import { describe, expect, it } from "vitest";
import { getNavItem, isActivePath, navItems } from "./navigation";

describe("navigation", () => {
  it("has unique keys and routes", () => {
    expect(new Set(navItems.map((i) => i.key)).size).toBe(navItems.length);
    expect(new Set(navItems.map((i) => i.href)).size).toBe(navItems.length);
  });

  it("keeps the mobile bottom bar to four primary items plus More", () => {
    expect(navItems.filter((i) => i.primaryMobile)).toHaveLength(4);
  });

  it("matches nested routes but not sibling prefixes", () => {
    expect(isActivePath("/meals", "/meals")).toBe(true);
    expect(isActivePath("/meals/plan/2026-10-01", "/meals")).toBe(true);
    expect(isActivePath("/mealsx", "/meals")).toBe(false);
  });

  it("throws for unknown keys", () => {
    expect(() => getNavItem("nope")).toThrow();
  });
});
