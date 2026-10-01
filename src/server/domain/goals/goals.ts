import { addDays, daysBetween, type DateOnly } from "../dates";
import { bmi } from "../body/units";
import { PROFESSIONAL_NOTE, type SafetyIssue } from "../safety/types";

export type GoalType =
  "FAT_LOSS" | "WEIGHT_LOSS" | "MAINTENANCE" | "MUSCLE_GAIN" | "STRENGTH" | "GENERAL_FITNESS";
export type GoalMetric = "BODY_WEIGHT_KG" | "BODY_FAT_PCT" | "WAIST_CM" | "WORKOUTS_PER_WEEK" | "NONE";

/** Which metrics make sense for each goal type (first is the default). */
export const METRICS_FOR_GOAL: Record<GoalType, GoalMetric[]> = {
  FAT_LOSS: ["BODY_WEIGHT_KG", "BODY_FAT_PCT", "WAIST_CM", "NONE"],
  WEIGHT_LOSS: ["BODY_WEIGHT_KG", "NONE"],
  MAINTENANCE: ["BODY_WEIGHT_KG", "NONE"],
  MUSCLE_GAIN: ["BODY_WEIGHT_KG", "NONE"],
  STRENGTH: ["NONE", "WORKOUTS_PER_WEEK"],
  GENERAL_FITNESS: ["NONE", "WORKOUTS_PER_WEEK"],
};

/** Direction a goal's metric should move. */
export function expectedDirection(type: GoalType, metric: GoalMetric): "down" | "up" | "hold" | "none" {
  if (metric === "NONE" || metric === "WORKOUTS_PER_WEEK") return "none";
  if (type === "MAINTENANCE") return "hold";
  if (type === "MUSCLE_GAIN") return "up";
  if (type === "FAT_LOSS" || type === "WEIGHT_LOSS") return "down";
  return "none";
}

// Weekly rates as a fraction of body weight.
const LOSS_WARN_RATE = 0.01; // >1%/week is aggressive
const LOSS_SUGGESTED_RATE = 0.0075;
const LOSS_EXTENSION_RATE = 0.005; // gentler pace used when proposing a new deadline
const GAIN_WARN_RATE = 0.005; // >0.5%/week mostly adds fat
const GAIN_SUGGESTED_RATE = 0.0025;

export type GoalPlan = {
  type: GoalType;
  metric: GoalMetric;
  startValue: number | null;
  targetValue: number | null;
  startDate: DateOnly;
  targetDate: DateOnly | null;
};

export type GoalSafetyContext = { heightCm: number | null; age: number | null };

/**
 * Deterministic checks for a goal. Validation errors (wrong direction, target
 * date in the past) are `block`; aggressive-but-possible plans are `warn` and
 * come with a safer target date suggestion.
 */
export function checkGoalPlan(plan: GoalPlan, ctx: GoalSafetyContext): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const direction = expectedDirection(plan.type, plan.metric);

  if (plan.targetDate && daysBetween(plan.startDate, plan.targetDate) < 7) {
    issues.push({
      code: "TARGET_DATE_TOO_SOON",
      field: "targetDate",
      severity: "block",
      message: "Choose a target date at least a week from the start date.",
    });
  }

  const { startValue: start, targetValue: target } = plan;
  if (start !== null && target !== null) {
    if (direction === "down" && target >= start) {
      issues.push({
        code: "TARGET_WRONG_DIRECTION",
        field: "targetValue",
        severity: "block",
        message: "For this goal the target should be lower than where you're starting.",
      });
    }
    if (direction === "up" && target <= start) {
      issues.push({
        code: "TARGET_WRONG_DIRECTION",
        field: "targetValue",
        severity: "block",
        message: "For muscle gain the target should be higher than where you're starting.",
      });
    }
  }

  if (plan.metric === "BODY_WEIGHT_KG" && target !== null) {
    const targetBmi = bmi(target, ctx.heightCm);
    if (targetBmi !== null && targetBmi < 17) {
      issues.push({
        code: "TARGET_BMI_TOO_LOW",
        field: "targetValue",
        severity: "block",
        message: `That target is well below a healthy weight range for your height. ${PROFESSIONAL_NOTE}`,
      });
    } else if (targetBmi !== null && targetBmi < 18.5) {
      issues.push({
        code: "TARGET_BMI_LOW",
        field: "targetValue",
        severity: "warn",
        message: `That target is below the healthy weight range for your height (BMI under 18.5). ${PROFESSIONAL_NOTE}`,
      });
    }
  }

  if (
    plan.metric === "BODY_WEIGHT_KG" &&
    start !== null &&
    target !== null &&
    plan.targetDate &&
    !issues.some((i) => i.severity === "block")
  ) {
    const weeks = daysBetween(plan.startDate, plan.targetDate) / 7;
    const weeklyRate = Math.abs(target - start) / start / weeks;
    if (direction === "down" && weeklyRate > LOSS_WARN_RATE) {
      const safeDate = addDays(
        plan.startDate,
        Math.ceil(((start - target) / (start * LOSS_SUGGESTED_RATE)) * 7),
      );
      issues.push({
        code: "LOSS_TOO_FAST",
        field: "targetDate",
        severity: "warn",
        message: `This means losing about ${((weeklyRate * start) as number).toFixed(1)} kg a week (${(weeklyRate * 100).toFixed(1)}% of your weight). Faster than ~1% a week tends to cost muscle and is hard to sustain.`,
        suggestion: {
          field: "targetDate",
          value: safeDate,
          label: "A steadier pace would reach it around",
        },
      });
    }
    if (direction === "up" && weeklyRate > GAIN_WARN_RATE) {
      const safeDate = addDays(
        plan.startDate,
        Math.ceil(((target - start) / (start * GAIN_SUGGESTED_RATE)) * 7),
      );
      issues.push({
        code: "GAIN_TOO_FAST",
        field: "targetDate",
        severity: "warn",
        message: `This means gaining about ${(weeklyRate * start).toFixed(2)} kg a week. Above ~0.5% a week, most of the extra weight tends to be fat rather than muscle.`,
        suggestion: {
          field: "targetDate",
          value: safeDate,
          label: "A steadier pace would reach it around",
        },
      });
    }
  }

  if (ctx.age !== null && ctx.age < 18 && direction === "down") {
    issues.push({
      code: "UNDER_18_LOSS",
      severity: "warn",
      message: "Weight-loss goals for teenagers should be set with a parent, doctor or registered dietitian.",
    });
  }

  return issues;
}

export type GoalEvaluation =
  | { state: "no_target" }
  | { state: "no_data" }
  | { state: "in_progress"; fraction: number; remaining: number }
  | { state: "achieved"; fraction: 1; remaining: 0 }
  | { state: "deadline_passed"; fraction: number; remaining: number; suggestedTargetDate: DateOnly };

/**
 * Where a goal stands, given the latest measured value. Missing data is
 * reported as `no_data` — never assumed to be progress or regress.
 *
 * When the deadline has passed, the suggestion only ever extends the timeline
 * at a gentle pace; it never makes the plan more aggressive.
 */
export function evaluateGoal(goal: GoalPlan, latestValue: number | null, today: DateOnly): GoalEvaluation {
  const direction = expectedDirection(goal.type, goal.metric);
  const { startValue: start, targetValue: target } = goal;
  if (direction === "none" || target === null || start === null) return { state: "no_target" };
  if (latestValue === null) return { state: "no_data" };

  if (direction === "hold") {
    // Maintenance: "achieved" means within ±2% of the target; there's no deadline pressure.
    const within = Math.abs(latestValue - target) / target <= 0.02;
    return within
      ? { state: "achieved", fraction: 1, remaining: 0 }
      : { state: "in_progress", fraction: 0, remaining: round2(target - latestValue) };
  }

  const reached = direction === "down" ? latestValue <= target : latestValue >= target;
  if (reached) return { state: "achieved", fraction: 1, remaining: 0 };

  const fraction = clamp01((latestValue - start) / (target - start));
  const remaining = round2(Math.abs(target - latestValue));

  if (goal.targetDate && daysBetween(goal.targetDate, today) > 0) {
    const rate = direction === "down" ? LOSS_EXTENSION_RATE : GAIN_SUGGESTED_RATE;
    const baseline = goal.metric === "BODY_WEIGHT_KG" ? latestValue : Math.max(latestValue, 1);
    const weeksNeeded = goal.metric === "BODY_WEIGHT_KG" ? remaining / (baseline * rate) : 4;
    const days = Math.max(14, Math.ceil(weeksNeeded * 7));
    return { state: "deadline_passed", fraction, remaining, suggestedTargetDate: addDays(today, days) };
  }
  return { state: "in_progress", fraction, remaining };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
