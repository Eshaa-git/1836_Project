import { divideTotals, scaleProfile, sumNutrients, totalsToPer100g, type NutritionAmount } from "./amounts";
import type { NutrientProfile } from "./nutrients";

export type RecipeIngredient = {
  name: string;
  per100g: NutrientProfile;
  grams: number;
  /**
   * COOKING_FAT is listed and counted like any ingredient — never hidden.
   * `consumedFraction` < 1 models oil left in the pan or absorbed when deep
   * frying; that is always an estimate.
   */
  role: "INGREDIENT" | "COOKING_FAT";
  consumedFraction?: number;
  isEstimate?: boolean;
};

export type RecipeNutrition = {
  total: NutritionAmount;
  perServing: NutritionAmount | null;
  /** Per 100 g of the cooked dish, when its cooked weight is known. Incomplete nutrients are null. */
  per100g: NutrientProfile | null;
  isEstimate: boolean;
  /** Why the result is an estimate, for display. */
  estimateReasons: string[];
};

/**
 * Deterministic recipe nutrition from its ingredients. Scaling servings or
 * changing the oil quantity is just recomputing with new grams.
 */
export function computeRecipeNutrition(
  ingredients: RecipeIngredient[],
  options: { servings?: number; cookedWeightG?: number; cookedWeightIsEstimate?: boolean } = {},
): RecipeNutrition {
  if (!ingredients.length) throw new Error("A recipe needs at least one ingredient");
  const reasons: string[] = [];

  const items = ingredients.map((ing) => {
    if (!(ing.grams > 0)) throw new Error(`Invalid grams for ${ing.name}`);
    const fraction = ing.role === "COOKING_FAT" ? (ing.consumedFraction ?? 1) : 1;
    if (!(fraction > 0 && fraction <= 1)) throw new Error(`Invalid consumed fraction for ${ing.name}`);
    const partialFat = ing.role === "COOKING_FAT" && fraction < 1;
    if (partialFat) reasons.push(`Only part of the ${ing.name} is eaten (~${Math.round(fraction * 100)}%)`);
    if (ing.isEstimate) reasons.push(`${ing.name} amount is approximate`);
    return {
      amounts: scaleProfile(ing.per100g, ing.grams * fraction),
      isEstimate: Boolean(ing.isEstimate) || partialFat,
    };
  });

  const total = sumNutrients(items);
  if (options.cookedWeightG !== undefined && options.cookedWeightIsEstimate) {
    reasons.push("Cooked weight is approximate");
  }
  const isEstimate = total.isEstimate || reasons.length > 0;

  const perServing =
    options.servings !== undefined
      ? { totals: divideTotals(total.totals, options.servings), isEstimate }
      : null;
  const per100g =
    options.cookedWeightG !== undefined ? totalsToPer100g(total.totals, options.cookedWeightG) : null;

  return {
    total: { ...total, isEstimate },
    perServing,
    per100g,
    isEstimate,
    estimateReasons: [...new Set(reasons)],
  };
}
