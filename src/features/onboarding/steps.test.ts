import { describe, expect, it } from "vitest";
import { nextHref, ONBOARDING_STEPS, previousHref } from "./steps";

describe("onboarding steps", () => {
  it("starts with the only required step", () => {
    expect(ONBOARDING_STEPS[0].key).toBe("basics");
    expect(ONBOARDING_STEPS.filter((s) => s.required).map((s) => s.key)).toEqual(["basics"]);
  });

  it("links steps in order and ends at the summary", () => {
    expect(nextHref("basics")).toBe("/onboarding/goal");
    expect(nextHref("motivation")).toBe("/onboarding/done");
    expect(previousHref("basics")).toBeNull();
    expect(previousHref("goal")).toBe("/onboarding/basics");
  });
});
