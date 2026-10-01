import { sumNutrients, type NutrientTotals } from "../nutrition/amounts";
import type { NutrientKey, NutrientProfile } from "../nutrition/nutrients";
import { suggestMealTimes, toMinutes } from "../routine/meal-times";
import type { DateOnly } from "../dates";

/**
 * Builds a day's food log view: meal slots with statuses, totals and what
 * remains. The central rule: a meal with no entries is NOT_LOGGED, never
 * "skipped" and never zero — only the user can say they skipped it.
 */

export type MealSlot = { key: string; label: string; time: string | null };

export type SlotStatus = "LOGGED" | "SKIPPED" | "NOT_LOGGED" | "UPCOMING";

export type DayCompleteness =
  /** User confirmed everything is logged, or every meal is logged/skipped. */
  | "COMPLETE"
  /** Today, nothing missing so far, more meals to come. */
  | "IN_PROGRESS"
  /** Some past meals have nothing logged and weren't marked skipped. */
  | "PARTIAL"
  /** Nothing logged at all for a day that's under way or over. */
  | "NONE";

export type LoggedItem = { id: string; mealSlot: string; amounts: NutrientProfile; isEstimate: boolean };

export type RemainingValue =
  | { status: "no_target" }
  | { status: "unknown" }
  | { status: "exact" | "at_most"; value: number; over: boolean };

/** Minutes after a slot's time before an empty slot counts as "not logged". */
export const NOT_LOGGED_GRACE_MIN = 90;

/** Unique slot keys from the user's meal times ("Snack", "Snack 2"); defaults to 3 meals. */
export function mealSlotsFor(input: {
  mealTimes: { label: string; time: string }[];
  mealsPerDay: number | null;
  wakeTime: string | null;
  bedTime: string | null;
}): MealSlot[] {
  const base = input.mealTimes.length
    ? [...input.mealTimes].sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    : suggestMealTimes(input.mealsPerDay ?? 3, input.wakeTime, input.bedTime);
  const seen = new Map<string, number>();
  return base.map(({ label, time }) => {
    const clean = label.trim() || "Meal";
    const n = (seen.get(clean.toLowerCase()) ?? 0) + 1;
    seen.set(clean.toLowerCase(), n);
    const unique = n === 1 ? clean : `${clean} ${n}`;
    return { key: unique, label: unique, time };
  });
}

export type DayInput = {
  date: DateOnly;
  /** The user's current local date and minutes since midnight. */
  now: { date: DateOnly; minutes: number };
  slots: MealSlot[];
  items: LoggedItem[];
  skipped: string[];
  markedComplete: boolean;
  targets: Partial<Record<NutrientKey, number | null>>;
};

export type SlotView = MealSlot & { status: SlotStatus; itemIds: string[] };

export type DaySummary = {
  slots: SlotView[];
  completeness: DayCompleteness;
  /** Totals of logged food only. Value null = nothing known. */
  totals: NutrientTotals;
  isEstimate: boolean;
  remaining: Partial<Record<NutrientKey, RemainingValue>>;
  /** Slots worth asking about: "did you skip it, or not log it yet?" */
  unloggedSlots: string[];
};

export function slotStatus(
  slot: MealSlot,
  day: Pick<DayInput, "date" | "now">,
  hasItems: boolean,
  skipped: boolean,
): SlotStatus {
  if (hasItems) return "LOGGED";
  if (skipped) return "SKIPPED";
  if (day.date < day.now.date) return "NOT_LOGGED";
  if (day.date > day.now.date) return "UPCOMING";
  if (slot.time === null) return "UPCOMING";
  return toMinutes(slot.time) + NOT_LOGGED_GRACE_MIN <= day.now.minutes ? "NOT_LOGGED" : "UPCOMING";
}

export function summarizeDay(input: DayInput): DaySummary {
  const known = new Set(input.slots.map((s) => s.key));
  // Entries logged to a slot that isn't in today's template still show (e.g. "Late snack").
  const extraSlots: MealSlot[] = [...new Set(input.items.map((i) => i.mealSlot))]
    .filter((k) => !known.has(k))
    .map((k) => ({ key: k, label: k, time: null }));

  const slots: SlotView[] = [...input.slots, ...extraSlots].map((slot) => {
    const itemIds = input.items.filter((i) => i.mealSlot === slot.key).map((i) => i.id);
    return {
      ...slot,
      itemIds,
      status: slotStatus(slot, input, itemIds.length > 0, input.skipped.includes(slot.key)),
    };
  });

  const unloggedSlots = slots.filter((s) => s.status === "NOT_LOGGED").map((s) => s.key);
  const { totals, isEstimate } = sumNutrients(
    input.items.map((i) => ({ amounts: i.amounts, isEstimate: i.isEstimate })),
  );

  let completeness: DayCompleteness;
  if (input.markedComplete) completeness = "COMPLETE";
  else if (unloggedSlots.length) completeness = input.items.length ? "PARTIAL" : "NONE";
  else if (slots.some((s) => s.status === "UPCOMING")) completeness = "IN_PROGRESS";
  else completeness = input.items.length || slots.some((s) => s.status === "SKIPPED") ? "COMPLETE" : "NONE";

  const remaining: DaySummary["remaining"] = {};
  for (const [key, target] of Object.entries(input.targets) as [NutrientKey, number | null][]) {
    remaining[key] = remainingFor(target, totals[key], completeness, input.items.length);
  }

  return { slots, completeness, totals, isEstimate, remaining, unloggedSlots };
}

function remainingFor(
  target: number | null | undefined,
  total: NutrientTotals[NutrientKey],
  completeness: DayCompleteness,
  itemCount: number,
): RemainingValue {
  if (target === null || target === undefined) return { status: "no_target" };
  if (completeness === "NONE") return { status: "unknown" };
  const eaten = itemCount === 0 ? 0 : total.value;
  if (eaten === null) return { status: "unknown" };
  const value = target - eaten;
  // Unknown nutrient values or unlogged meals mean less may actually remain.
  const exact = completeness !== "PARTIAL" && (itemCount === 0 || total.complete);
  return { status: exact ? "exact" : "at_most", value: Math.max(0, value), over: value < 0 };
}
