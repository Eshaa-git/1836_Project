/**
 * Describes progress toward a daily nutrient target for display.
 *
 * `null` means UNKNOWN — not logged, or no target yet — and is never shown as 0.
 * This is a presentation helper; authoritative nutrient totals come from the
 * server-side nutrition engine.
 */
export type NutrientProgressState = "no-target" | "not-logged" | "under" | "met" | "over";

export type NutrientProgress = {
  state: NutrientProgressState;
  /** 0–100 for the progress bar, or null when progress can't be computed. */
  percent: number | null;
  /** e.g. "1,750 / 2,000 kcal" or "— / 150 g". */
  label: string;
};

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function describeNutrientProgress(
  consumed: number | null,
  target: number | null,
  unit: string,
  /** Fraction above target considered "over" (default 10%). */
  overTolerance = 0.1,
): NutrientProgress {
  const consumedText = consumed === null ? "—" : fmt.format(consumed);
  const targetText = target === null ? "—" : fmt.format(target);
  const label = `${consumedText} / ${targetText} ${unit}`;

  if (target === null || target <= 0) return { state: "no-target", percent: null, label };
  if (consumed === null) return { state: "not-logged", percent: null, label };

  const ratio = consumed / target;
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  if (ratio > 1 + overTolerance) return { state: "over", percent, label };
  if (ratio >= 1) return { state: "met", percent, label };
  return { state: "under", percent, label };
}
