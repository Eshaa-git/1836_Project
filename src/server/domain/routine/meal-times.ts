/**
 * Suggests meal times spread across the waking day. A starting point the user
 * edits freely; eating at other times is never treated as a failure.
 */
export type MealTime = { label: string; time: string };

const LABELS: Record<number, string[]> = {
  1: ["Meal"],
  2: ["Brunch", "Dinner"],
  3: ["Breakfast", "Lunch", "Dinner"],
  4: ["Breakfast", "Lunch", "Snack", "Dinner"],
  5: ["Breakfast", "Snack", "Lunch", "Snack", "Dinner"],
  6: ["Breakfast", "Snack", "Lunch", "Snack", "Dinner", "Snack"],
  7: ["Breakfast", "Snack", "Lunch", "Snack", "Snack", "Dinner", "Snack"],
  8: ["Breakfast", "Snack", "Lunch", "Snack", "Snack", "Dinner", "Snack", "Snack"],
};

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const m = (((Math.round(minutes / 15) * 15) % 1440) + 1440) % 1440; // round to 15 min
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * First meal ~1 hour after waking, last meal ~3 hours before bed, the rest
 * evenly spaced. Handles bedtimes after midnight. Defaults: 07:00–23:00.
 */
export function suggestMealTimes(
  mealsPerDay: number,
  wakeTime?: string | null,
  bedTime?: string | null,
): MealTime[] {
  const count = Math.min(8, Math.max(1, Math.round(mealsPerDay)));
  const wake = toMinutes(wakeTime ?? "07:00");
  let bed = toMinutes(bedTime ?? "23:00");
  if (bed <= wake) bed += 1440;

  const first = wake + 60;
  const last = Math.max(first, bed - 180);
  const labels = LABELS[count]!;
  if (count === 1) return [{ label: labels[0]!, time: fromMinutes((first + last) / 2) }];
  const step = (last - first) / (count - 1);
  return labels.map((label, i) => ({ label, time: fromMinutes(first + step * i) }));
}
