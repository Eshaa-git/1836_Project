import { tagAllergens, type AllergenTags } from "../dietary/allergen-tagging";
import { normalizeUnit, unitKind, type FoodPortion } from "./food-units";
import { emptyProfile, NUTRIENTS, type NutrientProfile } from "./nutrients";

/** The subset of a USDA FoodData Central SR Legacy JSON food record we use. */
export type UsdaFood = {
  fdcId: number;
  description: string;
  foodCategory?: { description: string } | null;
  foodNutrients: { nutrient: { number: string; unitName: string }; amount?: number | null }[];
  foodPortions: { amount?: number | null; modifier?: string | null; gramWeight: number }[];
};

export type MappedFood = {
  sourceId: string;
  name: string;
  category: string | null;
  per100g: NutrientProfile;
  portions: FoodPortion[];
  allergens: AllergenTags;
};

const SIZE_WORDS: [RegExp, string][] = [
  [/\bextra[- ]large\b/, "extra_large"],
  [/\bjumbo\b/, "jumbo"],
  [/\blarge\b/, "large"],
  [/\bmedium\b/, "medium"],
  [/\bsmall\b/, "small"],
];

/**
 * USDA portion modifiers are free text ("cup, chopped", "medium (3\" dia)",
 * "Potato small (1-3/4\" to 2-1/2\" dia)"). Picks the unit from the first word
 * when it's a measure or count; otherwise from a size word anywhere.
 */
export function parseUsdaPortion(p: UsdaFood["foodPortions"][number]): FoodPortion | null {
  const amount = p.amount && p.amount > 0 ? p.amount : 1;
  if (!(p.gramWeight > 0)) return null;
  const modifier = (p.modifier ?? "").trim();
  const lower = modifier.toLowerCase();
  const first = lower.match(/^(fl oz|[a-z]+)/)?.[1] ?? "";

  let unit = normalizeUnit(first);
  const kind = unitKind(unit);
  if (kind === "mass") return null; // grams/ounces are handled universally
  if (kind === "count") {
    // "Potato small (…)" → small; "slice, medium (1/8\" thick)" stays a slice.
    const size = SIZE_WORDS.find(([re]) => re.test(lower));
    if (size && !/^(slice|piece|serving|cup|tbsp|tsp|strip|wedge|leaf|ring|floweret)/.test(lower))
      unit = size[1];
  }
  if (!unit || unit === "nlea") unit = "serving";
  const label = `${formatAmount(amount)} ${modifier}`.trim();
  return { unit, amount, gramWeight: p.gramWeight, label };
}

function formatAmount(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** Removes administrative notes from USDA descriptions. */
export function cleanUsdaName(description: string): string {
  return description.replace(/\s*\(Includes foods for USDA's Food Distribution Program\)/i, "").trim();
}

export function mapUsdaFood(food: UsdaFood): MappedFood {
  const per100g = emptyProfile();
  const byNumber = new Map(food.foodNutrients.map((n) => [n.nutrient.number, n]));
  for (const meta of NUTRIENTS) {
    const n = byNumber.get(meta.fdcNumber);
    // Missing → null (unknown). USDA's own "assumed zero" entries are real zeros.
    per100g[meta.key] = n && typeof n.amount === "number" ? n.amount : null;
  }
  const category = food.foodCategory?.description ?? null;
  return {
    sourceId: String(food.fdcId),
    name: cleanUsdaName(food.description),
    category,
    per100g,
    portions: food.foodPortions.map(parseUsdaPortion).filter((p): p is FoodPortion => p !== null),
    allergens: tagAllergens(cleanUsdaName(food.description), category),
  };
}
