import { cmToIn, kgToLb, round } from "@/server/domain/body/units";
import type { GoalEvaluation } from "@/server/domain/goals/goals";
import type { GoalView } from "@/server/services/goals";
import type { GoalDisplay } from "./components/goal-status-card";

/** Formats a goal metric value in the user's units, e.g. "72.5 kg", "160.3 lb", "31 in", "22%". */
export function formatMetricValue(
  metric: GoalView["metric"],
  value: number | null,
  system: "METRIC" | "IMPERIAL",
): string | null {
  if (value === null) return null;
  switch (metric) {
    case "BODY_WEIGHT_KG":
      return system === "IMPERIAL" ? `${round(kgToLb(value))} lb` : `${round(value)} kg`;
    case "WAIST_CM":
      return system === "IMPERIAL" ? `${round(cmToIn(value))} in` : `${round(value)} cm`;
    case "BODY_FAT_PCT":
      return `${round(value)}%`;
    default:
      return null;
  }
}

export function toGoalDisplay(
  state: { goal: GoalView; current: { value: number; localDate: string } | null; evaluation: GoalEvaluation },
  system: "METRIC" | "IMPERIAL",
): GoalDisplay {
  const f = (v: number | null) => formatMetricValue(state.goal.metric, v, system);
  const remaining = "remaining" in state.evaluation ? Math.abs(state.evaluation.remaining) : null;
  return {
    ...state,
    displayValues: {
      start: f(state.goal.startValue),
      current: f(state.current?.value ?? null),
      target: f(state.goal.targetValue),
      remaining: remaining === null ? null : f(remaining),
    },
  };
}
