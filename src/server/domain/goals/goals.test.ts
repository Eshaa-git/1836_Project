import { describe, expect, it } from "vitest";
import {
  checkGoalPlan,
  evaluateGoal,
  expectedDirection,
  type GoalPlan,
  type GoalSafetyContext,
} from "./goals";

const loss: GoalPlan = {
  type: "FAT_LOSS",
  metric: "BODY_WEIGHT_KG",
  startValue: 80,
  targetValue: 72,
  startDate: "2026-10-01",
  targetDate: "2027-03-01",
};
const ctx: GoalSafetyContext = { heightCm: 170, age: 30 };
const codes = (plan: Partial<GoalPlan>, c = ctx) =>
  checkGoalPlan({ ...loss, ...plan }, c).map((i) => `${i.severity}:${i.code}`);

describe("expectedDirection", () => {
  it("derives direction from goal type and metric", () => {
    expect(expectedDirection("FAT_LOSS", "WAIST_CM")).toBe("down");
    expect(expectedDirection("MUSCLE_GAIN", "BODY_WEIGHT_KG")).toBe("up");
    expect(expectedDirection("MAINTENANCE", "BODY_WEIGHT_KG")).toBe("hold");
    expect(expectedDirection("STRENGTH", "NONE")).toBe("none");
  });
});

describe("checkGoalPlan", () => {
  it("accepts a steady fat-loss plan", () => {
    expect(codes({})).toEqual([]);
  });

  it("blocks a target in the wrong direction", () => {
    expect(codes({ targetValue: 85 })).toEqual(["block:TARGET_WRONG_DIRECTION"]);
    expect(codes({ type: "MUSCLE_GAIN", targetValue: 75 })).toEqual(["block:TARGET_WRONG_DIRECTION"]);
  });

  it("blocks a target date less than a week away", () => {
    expect(codes({ targetDate: "2026-10-03" })).toContain("block:TARGET_DATE_TOO_SOON");
  });

  it("warns when weight loss is faster than 1% a week and suggests a steadier date", () => {
    const issues = checkGoalPlan({ ...loss, targetValue: 70, targetDate: "2026-11-01" }, ctx);
    expect(issues.map((i) => i.code)).toEqual(["LOSS_TOO_FAST"]);
    expect(issues[0]!.severity).toBe("warn");
    // 10 kg at 0.75% of 80 kg (0.6 kg/week) ≈ 16.7 weeks → 117 days after start.
    expect(issues[0]!.suggestion).toMatchObject({ field: "targetDate", value: "2027-01-26" });
  });

  it("warns when weight gain is faster than 0.5% a week", () => {
    expect(codes({ type: "MUSCLE_GAIN", startValue: 70, targetValue: 76, targetDate: "2026-12-01" })).toEqual(
      ["warn:GAIN_TOO_FAST"],
    );
  });

  it("warns below a healthy BMI and blocks well below it", () => {
    expect(codes({ targetValue: 52, targetDate: "2027-12-01" })).toEqual(["warn:TARGET_BMI_LOW"]);
    expect(codes({ targetValue: 45, targetDate: "2028-12-01" })).toEqual(["block:TARGET_BMI_TOO_LOW"]);
    // Without a height, BMI can't be judged.
    expect(codes({ targetValue: 52, targetDate: "2027-12-01" }, { heightCm: null, age: 30 })).toEqual([]);
  });

  it("asks teenagers to involve an adult for weight loss", () => {
    expect(codes({}, { heightCm: 170, age: 16 })).toEqual(["warn:UNDER_18_LOSS"]);
  });

  it("does not rate-check goals without a numeric target", () => {
    expect(codes({ type: "GENERAL_FITNESS", metric: "NONE", startValue: null, targetValue: null })).toEqual(
      [],
    );
  });
});

describe("evaluateGoal", () => {
  it("reports missing data rather than guessing", () => {
    expect(evaluateGoal(loss, null, "2026-11-01")).toEqual({ state: "no_data" });
  });

  it("reports progress from start toward target", () => {
    expect(evaluateGoal(loss, 76, "2026-11-01")).toEqual({
      state: "in_progress",
      fraction: 0.5,
      remaining: 4,
    });
  });

  it("clamps progress when the value moved the wrong way", () => {
    expect(evaluateGoal(loss, 81, "2026-11-01")).toMatchObject({ state: "in_progress", fraction: 0 });
  });

  it("detects an achieved goal", () => {
    expect(evaluateGoal(loss, 71.8, "2026-11-01")).toEqual({ state: "achieved", fraction: 1, remaining: 0 });
    expect(
      evaluateGoal({ ...loss, type: "MUSCLE_GAIN", startValue: 70, targetValue: 74 }, 74.2, "2026-11-01"),
    ).toMatchObject({
      state: "achieved",
    });
  });

  it("suggests a gentle extension when the deadline passes, never a harsher plan", () => {
    const result = evaluateGoal(loss, 75, "2027-03-10");
    expect(result.state).toBe("deadline_passed");
    if (result.state !== "deadline_passed") return;
    expect(result.remaining).toBe(3);
    // 3 kg at 0.5% of 75 kg/week = 8 weeks.
    expect(result.suggestedTargetDate).toBe("2027-05-05");
  });

  it("always gives at least two weeks when extending", () => {
    const result = evaluateGoal(loss, 72.2, "2027-03-10");
    expect(result).toMatchObject({ state: "deadline_passed", suggestedTargetDate: "2027-03-24" });
  });

  it("treats maintenance within ±2% as achieved", () => {
    const maintain: GoalPlan = { ...loss, type: "MAINTENANCE", startValue: 70, targetValue: 70 };
    expect(evaluateGoal(maintain, 71, "2026-11-01")).toMatchObject({ state: "achieved" });
    expect(evaluateGoal(maintain, 73, "2026-11-01")).toMatchObject({ state: "in_progress", remaining: -3 });
  });

  it("has nothing to evaluate without a numeric target", () => {
    expect(evaluateGoal({ ...loss, metric: "NONE" }, 70, "2026-11-01")).toEqual({ state: "no_target" });
  });
});
