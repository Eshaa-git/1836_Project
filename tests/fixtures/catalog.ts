import type { PrismaClient } from "../../src/generated/prisma/client";
import { buildDish } from "../../src/server/catalog/dishes";
import { saveFood } from "../../src/server/catalog/write";
import { tagAllergens } from "../../src/server/domain/dietary/allergen-tagging";
import { mapUsdaFood, type UsdaFood } from "../../src/server/domain/nutrition/usda";
import { emptyProfile } from "../../src/server/domain/nutrition/nutrients";
import sample from "./usda-sample.json";

/** A small, offline food catalog for integration and e2e tests. */
export async function seedTestCatalog(db: PrismaClient) {
  const ids: Record<string, string> = {};
  for (const usda of sample as UsdaFood[]) {
    const mapped = mapUsdaFood(usda);
    ids[mapped.name] = await saveFood(db, {
      source: "USDA_SR_LEGACY",
      sourceVersion: "test",
      ...mapped,
      aliases: mapped.name.startsWith("Egg") ? ["egg", "eggs"] : [],
      isCommon: mapped.name.startsWith("Egg"),
    });
  }
  const peanutButter = {
    name: "Peanut butter, smooth style, without salt",
    category: "Legumes and Legume Products",
  };
  ids[peanutButter.name] = await saveFood(db, {
    source: "USDA_SR_LEGACY",
    sourceId: "172470",
    sourceVersion: "test",
    ...peanutButter,
    per100g: { ...emptyProfile(), energyKcal: 598, proteinG: 22.2, fatG: 51.4, carbsG: 22.3 },
    portions: [{ unit: "tbsp", amount: 2, gramWeight: 32, label: "2 tbsp" }],
    allergens: tagAllergens(peanutButter.name, peanutButter.category),
  });
  const dosa = buildDish(
    {
      slug: "plain-dosa",
      name: "Dosa, plain (home-style)",
      aliases: ["dosa", "dosai"],
      ingredients: [{ fdcId: "potato", grams: 100 }],
      cookedWeightG: 100,
      portions: [{ unit: "piece", amount: 1, gramWeight: 55, label: "1 dosa (~55 g)" }],
    },
    new Map([
      [
        "potato",
        { name: "Potato", per100g: { ...emptyProfile(), energyKcal: 200, proteinG: 4 }, allergens: [] },
      ],
    ]),
  );
  ids[dosa.name] = await saveFood(db, dosa);
  return ids;
}
