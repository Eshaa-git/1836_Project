import { describe, expect, it } from "vitest";
import { emptyProfile, type NutrientProfile } from "./nutrients";
import { computeRecipeNutrition, type RecipeIngredient } from "./recipe";

const p = (v: Partial<NutrientProfile>): NutrientProfile => ({ ...emptyProfile(), ...v });
const rice: RecipeIngredient = {
  name: "Rice",
  per100g: p({ energyKcal: 360, proteinG: 7, fatG: 1 }),
  grams: 150,
  role: "INGREDIENT",
};
const urad: RecipeIngredient = {
  name: "Urad dal",
  per100g: p({ energyKcal: 341, proteinG: 25, fatG: 1.6 }),
  grams: 50,
  role: "INGREDIENT",
};
const oil = (grams: number, consumedFraction?: number): RecipeIngredient => ({
  name: "Sunflower oil",
  per100g: p({ energyKcal: 884, proteinG: 0, fatG: 100 }),
  grams,
  role: "COOKING_FAT",
  consumedFraction,
});

describe("computeRecipeNutrition", () => {
  it("adds every ingredient including the cooking oil", () => {
    const r = computeRecipeNutrition([rice, urad, oil(36)], { servings: 8 });
    // 540 + 170.5 + 318.24
    expect(r.total.totals.energyKcal.value).toBeCloseTo(1028.74);
    expect(r.perServing?.totals.energyKcal.value).toBeCloseTo(128.59, 1);
    expect(r.isEstimate).toBe(false);
  });

  it("recalculates calories and fat when the oil changes", () => {
    const less = computeRecipeNutrition([rice, urad, oil(18)], { servings: 8 });
    const more = computeRecipeNutrition([rice, urad, oil(36)], { servings: 8 });
    expect(more.total.totals.energyKcal.value! - less.total.totals.energyKcal.value!).toBeCloseTo(159.12);
    expect(more.total.totals.fatG.value! - less.total.totals.fatG.value!).toBeCloseTo(18);
  });

  it("scales servings: same recipe, more servings, less per serving", () => {
    const four = computeRecipeNutrition([rice, oil(10)], { servings: 4 });
    const two = computeRecipeNutrition([rice, oil(10)], { servings: 2 });
    expect(two.perServing!.totals.proteinG.value).toBeCloseTo(four.perServing!.totals.proteinG.value! * 2);
  });

  it("marks partial oil absorption as an estimate and explains why", () => {
    const fried = computeRecipeNutrition([rice, oil(100, 0.15)], { servings: 2 });
    expect(fried.total.totals.fatG.value).toBeCloseTo(1.5 + 15);
    expect(fried.isEstimate).toBe(true);
    expect(fried.estimateReasons[0]).toMatch(/15%/);
  });

  it("produces per-100 g values from the cooked weight, leaving incomplete nutrients unknown", () => {
    const r = computeRecipeNutrition([rice, urad, oil(36)], {
      cookedWeightG: 640,
      cookedWeightIsEstimate: true,
    });
    expect(r.per100g!.energyKcal).toBeCloseTo(160.74, 1);
    expect(r.per100g!.ironMg).toBeNull();
    expect(r.estimateReasons).toContain("Cooked weight is approximate");
  });

  it("rejects empty recipes and invalid amounts", () => {
    expect(() => computeRecipeNutrition([])).toThrow();
    expect(() => computeRecipeNutrition([{ ...rice, grams: 0 }])).toThrow();
    expect(() => computeRecipeNutrition([oil(10, 1.5)])).toThrow();
  });
});
