/**
 * Imports the food catalog:
 *   1. USDA FoodData Central SR Legacy (public domain) — downloaded once into .data/usda
 *   2. Everyday aliases for common foods (prisma/seed/food-aliases.ts)
 *   3. Curated home-style dishes computed from USDA ingredients (prisma/seed/dishes.ts)
 *
 *   npm run db:import-foods            (safe to re-run: existing foods keep their ids and are refreshed)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DISHES } from "../prisma/seed/dishes";
import { FOOD_ALIASES } from "../prisma/seed/food-aliases";
import { buildDish, type IngredientFood } from "../src/server/catalog/dishes";
import { saveFood, upsertFoodsBulk } from "../src/server/catalog/write";
import { isAllergenCode } from "../src/server/domain/dietary/allergens";
import { mapUsdaFood, type UsdaFood } from "../src/server/domain/nutrition/usda";
import { NUTRIENT_KEYS, type NutrientProfile } from "../src/server/domain/nutrition/nutrients";
import { createScriptClient } from "./lib/prisma";

const DATASET = {
  url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip",
  sha256: "0fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef",
  json: "FoodData_Central_sr_legacy_food_json_2018-04.json",
  version: "SR Legacy 2018-04",
};
/** Not useful for adult meal tracking and they crowd search results. */
const SKIP_CATEGORIES = new Set(["Baby Foods", "American Indian/Alaska Native Foods"]);
const DIR = path.resolve(".data/usda");

async function ensureDataset(): Promise<string> {
  const jsonPath = path.join(DIR, DATASET.json);
  if (existsSync(jsonPath)) return jsonPath;
  mkdirSync(DIR, { recursive: true });
  const zipPath = path.join(DIR, "sr_legacy.zip");
  if (!existsSync(zipPath)) {
    console.log(`Downloading ${DATASET.url}`);
    const res = await fetch(DATASET.url);
    if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(zipPath));
  }
  const digest = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
  if (digest !== DATASET.sha256) throw new Error(`Checksum mismatch for ${zipPath} (got ${digest})`);
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", DIR]);
  return jsonPath;
}

async function main() {
  const db = createScriptClient();
  try {
    const jsonPath = await ensureDataset();
    console.log("Reading USDA data…");
    const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as { SRLegacyFoods: UsdaFood[] };
    const foods = raw.SRLegacyFoods.filter((f) => !SKIP_CATEGORIES.has(f.foodCategory?.description ?? ""));

    let inserted = 0;
    let updated = 0;
    for (let i = 0; i < foods.length; i += 500) {
      const batch = foods.slice(i, i + 500).map((f) => {
        const mapped = mapUsdaFood(f);
        const aliases = FOOD_ALIASES[mapped.sourceId];
        return {
          source: "USDA_SR_LEGACY" as const,
          sourceVersion: DATASET.version,
          ...mapped,
          aliases,
          isCommon: Boolean(aliases),
        };
      });
      const result = await upsertFoodsBulk(db, batch);
      inserted += result.inserted;
      updated += result.updated;
      process.stdout.write(`\r  USDA foods: ${Math.min(i + 500, foods.length)}/${foods.length}`);
    }
    console.log(`\n  USDA foods: ${inserted} new, ${updated} refreshed`);

    const aliasTargets = await db.food.count({
      where: { source: "USDA_SR_LEGACY", sourceId: { in: Object.keys(FOOD_ALIASES) } },
    });
    if (aliasTargets !== Object.keys(FOOD_ALIASES).length) throw new Error("Some alias targets are missing");

    const ingredientIds = [...new Set(DISHES.flatMap((d) => d.ingredients.map((i) => i.fdcId)))];
    const rows = await db.food.findMany({
      where: { source: "USDA_SR_LEGACY", sourceId: { in: ingredientIds } },
      include: { nutrition: true, allergens: true },
    });
    const ingredients = new Map<string, IngredientFood>(
      rows.map((r) => [
        r.sourceId,
        {
          name: r.name,
          per100g: Object.fromEntries(
            NUTRIENT_KEYS.map((k) => [k, r.nutrition?.[k] ?? null]),
          ) as NutrientProfile,
          allergens: r.allergens.map((a) => a.allergenCode).filter(isAllergenCode),
        },
      ]),
    );
    for (const dish of DISHES) await saveFood(db, buildDish(dish, ingredients));
    console.log(`  saved ${DISHES.length} curated dishes`);
    console.log("Done.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
