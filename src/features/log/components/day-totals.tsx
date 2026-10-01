import { NutrientProgressRow } from "@/components/common/nutrient-progress-row";
import type { DayLogView } from "@/server/services/food-log";

const ROWS = [
  { key: "energyKcal", name: "Calories", unit: "kcal", tone: "energy" },
  { key: "proteinG", name: "Protein", unit: "g", tone: "protein" },
  { key: "carbsG", name: "Carbs", unit: "g", tone: "carbs" },
  { key: "fatG", name: "Fat", unit: "g", tone: "fat" },
  { key: "fiberG", name: "Fiber", unit: "g", tone: "fiber" },
] as const;

/** Target → eaten → remaining for a day. Only logged food counts as eaten. */
export function DayTotals({ day }: { day: DayLogView }) {
  const { totals, remaining } = day.summary;
  return (
    <div className="space-y-4">
      {ROWS.map((r) => {
        const total = totals[r.key];
        return (
          <NutrientProgressRow
            key={r.key}
            name={r.name}
            unit={r.unit}
            tone={r.tone}
            consumed={total.value}
            consumedIsLowerBound={total.value !== null && !total.complete}
            target={day.targets[r.key] ?? null}
            remaining={remaining[r.key]}
          />
        );
      })}
      {day.summary.isEstimate && (
        <p className="text-xs text-muted-foreground">
          Includes estimated values (home-style dishes or assumed portion sizes).
        </p>
      )}
    </div>
  );
}
