import type { FoodPortion } from "@/server/domain/nutrition/food-units";

/**
 * The portion calculator's choice key for an existing logged amount:
 * "p:<index>" for one of the food's own portions, "u:<unit>" for a unit.
 * Shared by server pages and the client calculator.
 */
export function choiceFor(
  entry: { unit: string; portionLabel: string | null },
  portions: FoodPortion[],
): string {
  if (entry.unit === "portion") {
    const index = portions.findIndex((p) => p.label === entry.portionLabel);
    return index >= 0 ? `p:${index}` : "u:g";
  }
  return `u:${entry.unit}`;
}
