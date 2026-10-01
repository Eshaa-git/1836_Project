/**
 * Nutrients tracked by Nourish. Values are per 100 g of food unless stated.
 * `null` always means UNKNOWN — never zero.
 */
export const NUTRIENT_KEYS = [
  "energyKcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
  "sugarsG",
  "saturatedFatG",
  "cholesterolMg",
  "sodiumMg",
  "potassiumMg",
  "calciumMg",
  "ironMg",
  "magnesiumMg",
  "zincMg",
  "vitaminAMcg",
  "vitaminCMg",
  "vitaminDMcg",
  "vitaminB12Mcg",
  "folateMcg",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type NutrientProfile = Record<NutrientKey, number | null>;

export type NutrientMeta = {
  key: NutrientKey;
  label: string;
  unit: "kcal" | "g" | "mg" | "µg";
  group: "energy" | "macro" | "detail" | "mineral" | "vitamin";
  decimals: number;
  /** USDA FoodData Central nutrient number. */
  fdcNumber: string;
};

export const NUTRIENTS: readonly NutrientMeta[] = [
  { key: "energyKcal", label: "Calories", unit: "kcal", group: "energy", decimals: 0, fdcNumber: "208" },
  { key: "proteinG", label: "Protein", unit: "g", group: "macro", decimals: 1, fdcNumber: "203" },
  { key: "carbsG", label: "Carbohydrates", unit: "g", group: "macro", decimals: 1, fdcNumber: "205" },
  { key: "fatG", label: "Fat", unit: "g", group: "macro", decimals: 1, fdcNumber: "204" },
  { key: "fiberG", label: "Fiber", unit: "g", group: "macro", decimals: 1, fdcNumber: "291" },
  { key: "sugarsG", label: "Sugars", unit: "g", group: "detail", decimals: 1, fdcNumber: "269" },
  { key: "saturatedFatG", label: "Saturated fat", unit: "g", group: "detail", decimals: 1, fdcNumber: "606" },
  { key: "cholesterolMg", label: "Cholesterol", unit: "mg", group: "detail", decimals: 0, fdcNumber: "601" },
  { key: "sodiumMg", label: "Sodium", unit: "mg", group: "mineral", decimals: 0, fdcNumber: "307" },
  { key: "potassiumMg", label: "Potassium", unit: "mg", group: "mineral", decimals: 0, fdcNumber: "306" },
  { key: "calciumMg", label: "Calcium", unit: "mg", group: "mineral", decimals: 0, fdcNumber: "301" },
  { key: "ironMg", label: "Iron", unit: "mg", group: "mineral", decimals: 1, fdcNumber: "303" },
  { key: "magnesiumMg", label: "Magnesium", unit: "mg", group: "mineral", decimals: 0, fdcNumber: "304" },
  { key: "zincMg", label: "Zinc", unit: "mg", group: "mineral", decimals: 1, fdcNumber: "309" },
  { key: "vitaminAMcg", label: "Vitamin A", unit: "µg", group: "vitamin", decimals: 0, fdcNumber: "320" },
  { key: "vitaminCMg", label: "Vitamin C", unit: "mg", group: "vitamin", decimals: 1, fdcNumber: "401" },
  { key: "vitaminDMcg", label: "Vitamin D", unit: "µg", group: "vitamin", decimals: 1, fdcNumber: "328" },
  { key: "vitaminB12Mcg", label: "Vitamin B12", unit: "µg", group: "vitamin", decimals: 1, fdcNumber: "418" },
  { key: "folateMcg", label: "Folate", unit: "µg", group: "vitamin", decimals: 0, fdcNumber: "435" },
];

export function emptyProfile(): NutrientProfile {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as NutrientProfile;
}

export function getNutrientMeta(key: NutrientKey): NutrientMeta {
  return NUTRIENTS.find((n) => n.key === key)!;
}
