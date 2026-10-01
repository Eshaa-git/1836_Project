import { describe, expect, it } from "vitest";
import { chooseFocus } from "./focus";

const base = { goalState: "in_progress" as const, hasTargets: true, hasRestrictionsInfo: true };

describe("chooseFocus", () => {
  it("celebrates an achieved goal before anything else", () => {
    expect(chooseFocus({ ...base, goalState: "achieved", hasTargets: false }).cta).toBe("Celebrate");
  });

  it("offers a gentle timeline review after a missed deadline", () => {
    expect(chooseFocus({ ...base, goalState: "deadline_passed" }).href).toBe("/profile/goal");
  });

  it("asks about an unlogged meal before setup reminders", () => {
    expect(chooseFocus({ ...base, hasTargets: false, unloggedSlot: "Lunch" }).title).toBe(
      "Did you have lunch?",
    );
    expect(chooseFocus({ ...base, goalState: "achieved", unloggedSlot: "Lunch" }).cta).toBe("Celebrate");
  });

  it("asks for missing setup in order: targets, goal, food", () => {
    expect(chooseFocus({ ...base, hasTargets: false }).href).toBe("/profile/targets");
    expect(chooseFocus({ ...base, goalState: null }).href).toBe("/profile/goal");
    expect(chooseFocus({ ...base, hasRestrictionsInfo: false }).href).toBe("/profile/food");
  });

  it("falls back to logging food", () => {
    expect(chooseFocus(base).href).toBe("/coach");
  });
});
