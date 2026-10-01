/**
 * Writes reference foods (USDA, curated dishes) to the database.
 * Deliberately free of `server-only` and env so the import script and tests can
 * use it with their own Prisma client.
 */
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { AllergenTags } from "@/server/domain/dietary/allergen-tagging";
import type { FoodPortion } from "@/server/domain/nutrition/food-units";
import { NUTRIENT_KEYS, type NutrientProfile } from "@/server/domain/nutrition/nutrients";

export type CatalogFoodInput = {
  source: "USDA_SR_LEGACY" | "CURATED";
  sourceId: string;
  sourceVersion: string;
  name: string;
  category: string | null;
  aliases?: string[];
  isCommon?: boolean;
  isEstimate?: boolean;
  basis?: Prisma.InputJsonValue;
  per100g: NutrientProfile;
  portions: FoodPortion[];
  allergens: AllergenTags;
};

type Db = PrismaClient | Prisma.TransactionClient;

export function searchTextFor(name: string, aliases: string[] = []): string {
  return [name, ...aliases].join(" | ").toLowerCase();
}

function nutritionData(per100g: NutrientProfile) {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, per100g[k]])) as Record<string, number | null>;
}

/** Inserts or fully replaces one food (and its nutrition, portions, allergens). */
export async function saveFood(db: Db, input: CatalogFoodInput): Promise<string> {
  const data = {
    sourceVersion: input.sourceVersion,
    name: input.name,
    category: input.category,
    aliases: input.aliases ?? [],
    searchText: searchTextFor(input.name, input.aliases),
    isCommon: input.isCommon ?? false,
    isEstimate: input.isEstimate ?? false,
    basis: input.basis,
    allergenAssessment: input.allergens.assessment,
  };
  const food = await db.food.upsert({
    where: { source_sourceId: { source: input.source, sourceId: input.sourceId } },
    create: { source: input.source, sourceId: input.sourceId, ...data },
    update: data,
  });
  await db.foodNutrition.upsert({
    where: { foodId: food.id },
    create: { foodId: food.id, ...nutritionData(input.per100g) },
    update: nutritionData(input.per100g),
  });
  await db.foodPortion.deleteMany({ where: { foodId: food.id } });
  if (input.portions.length) {
    await db.foodPortion.createMany({
      data: input.portions.map((p, i) => ({
        foodId: food.id,
        ...p,
        isEstimate: p.isEstimate ?? false,
        sortOrder: i,
      })),
    });
  }
  await db.foodAllergen.deleteMany({ where: { foodId: food.id } });
  if (input.allergens.contains.length) {
    await db.foodAllergen.createMany({
      data: input.allergens.contains.map((allergenCode) => ({ foodId: food.id, allergenCode })),
    });
  }
  return food.id;
}

/**
 * Bulk insert-or-refresh for imports. Existing (source, sourceId) foods keep
 * their ids (so logs that reference them stay valid) but get fresh names,
 * nutrients, portions and allergen tags.
 */
export async function upsertFoodsBulk(
  db: PrismaClient,
  inputs: CatalogFoodInput[],
): Promise<{ inserted: number; updated: number }> {
  if (!inputs.length) return { inserted: 0, updated: 0 };
  const source = inputs[0]!.source;
  if (inputs.some((i) => i.source !== source)) throw new Error("A batch must have a single source");

  return db.$transaction(
    async (tx) => {
      const existing = new Map(
        (
          await tx.food.findMany({
            where: { source, sourceId: { in: inputs.map((i) => i.sourceId) } },
            select: { id: true, sourceId: true },
          })
        ).map((f) => [f.sourceId, f.id]),
      );
      const fields = (i: CatalogFoodInput) => ({
        sourceVersion: i.sourceVersion,
        name: i.name,
        category: i.category,
        aliases: i.aliases ?? [],
        searchText: searchTextFor(i.name, i.aliases),
        isCommon: i.isCommon ?? false,
        isEstimate: i.isEstimate ?? false,
        allergenAssessment: i.allergens.assessment,
      });

      const fresh = inputs.filter((i) => !existing.has(i.sourceId));
      if (fresh.length) {
        await tx.food.createMany({
          data: fresh.map((i) => ({ source, sourceId: i.sourceId, ...fields(i) })),
        });
      }
      for (const i of inputs.filter((i) => existing.has(i.sourceId))) {
        await tx.food.update({ where: { id: existing.get(i.sourceId)! }, data: fields(i) });
      }

      const ids = new Map(
        (
          await tx.food.findMany({
            where: { source, sourceId: { in: inputs.map((i) => i.sourceId) } },
            select: { id: true, sourceId: true },
          })
        ).map((f) => [f.sourceId, f.id]),
      );
      const foodIds = [...ids.values()];
      await tx.foodNutrition.deleteMany({ where: { foodId: { in: foodIds } } });
      await tx.foodPortion.deleteMany({ where: { foodId: { in: foodIds } } });
      await tx.foodAllergen.deleteMany({ where: { foodId: { in: foodIds } } });
      await tx.foodNutrition.createMany({
        data: inputs.map((i) => ({ foodId: ids.get(i.sourceId)!, ...nutritionData(i.per100g) })),
      });
      await tx.foodPortion.createMany({
        data: inputs.flatMap((i) =>
          i.portions.map((p, n) => ({
            foodId: ids.get(i.sourceId)!,
            ...p,
            isEstimate: p.isEstimate ?? false,
            sortOrder: n,
          })),
        ),
      });
      await tx.foodAllergen.createMany({
        data: inputs.flatMap((i) =>
          i.allergens.contains.map((allergenCode) => ({ foodId: ids.get(i.sourceId)!, allergenCode })),
        ),
      });
      return { inserted: fresh.length, updated: inputs.length - fresh.length };
    },
    { timeout: 60_000 },
  );
}
