import type { DishDefinition } from "../../../prisma/seed/dishes";
import type { AllergenCode } from "@/server/domain/dietary/allergens";
import { computeRecipeNutrition } from "@/server/domain/nutrition/recipe";
import type { NutrientProfile } from "@/server/domain/nutrition/nutrients";
import type { CatalogFoodInput } from "./write";

export type IngredientFood = { name: string; per100g: NutrientProfile; allergens: AllergenCode[] };

export const DISH_CATEGORY = "Home-style dishes (estimated)";

/**
 * Builds a curated dish from its USDA ingredients using the deterministic
 * recipe engine. Every value is marked as an estimate; allergen status is
 * unverified because recipes vary.
 */
export function buildDish(def: DishDefinition, ingredients: Map<string, IngredientFood>): CatalogFoodInput {
  const resolved = def.ingredients.map((i) => {
    const food = ingredients.get(i.fdcId);
    if (!food) throw new Error(`Dish "${def.slug}" needs USDA food ${i.fdcId}, which isn't imported`);
    return { def: i, food };
  });

  const nutrition = computeRecipeNutrition(
    resolved.map(({ def: i, food }) => ({
      name: food.name,
      per100g: food.per100g,
      grams: i.grams,
      role: i.role ?? "INGREDIENT",
    })),
    { cookedWeightG: def.cookedWeightG, cookedWeightIsEstimate: true },
  );

  const allergens = [...new Set(resolved.flatMap(({ food }) => food.allergens))].sort();

  return {
    source: "CURATED",
    sourceId: def.slug,
    sourceVersion: "nourish-dishes-1",
    name: def.name,
    category: DISH_CATEGORY,
    aliases: def.aliases,
    isCommon: true,
    isEstimate: true,
    basis: {
      kind: "recipe",
      cookedWeightG: def.cookedWeightG,
      note: def.note ?? null,
      ingredients: resolved.map(({ def: i, food }) => ({
        fdcId: i.fdcId,
        name: food.name,
        grams: i.grams,
        role: i.role ?? "INGREDIENT",
        note: i.note ?? null,
      })),
    },
    per100g: nutrition.per100g!,
    portions: def.portions.map((p) => ({ ...p, isEstimate: true })),
    allergens: { contains: allergens, assessment: "UNVERIFIED" },
  };
}
