import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { isAllergenCode, type AllergenCode } from "@/server/domain/dietary/allergens";
import {
  checkFood,
  type DietType,
  type FoodFinding,
  type UserRestriction,
} from "@/server/domain/dietary/food-check";
import type { FoodPortion } from "@/server/domain/nutrition/food-units";
import { NUTRIENT_KEYS, type NutrientProfile } from "@/server/domain/nutrition/nutrients";
import { db } from "@/server/lib/db";
import { NotFoundError } from "@/server/lib/errors";

export type FoodSummary = {
  id: string;
  name: string;
  category: string | null;
  source: "USDA_SR_LEGACY" | "CURATED" | "USER";
  isEstimate: boolean;
  energyKcalPer100g: number | null;
  /** Most severe finding for this user, for list badges. */
  topFinding: FoodFinding | null;
};

export type FoodDetail = {
  id: string;
  name: string;
  category: string | null;
  source: "USDA_SR_LEGACY" | "CURATED" | "USER";
  sourceVersion: string | null;
  aliases: string[];
  isEstimate: boolean;
  basis: unknown;
  per100g: NutrientProfile;
  portions: FoodPortion[];
  allergens: { contains: AllergenCode[]; mayContain: AllergenCode[]; assessment: "ASSESSED" | "UNVERIFIED" };
  findings: FoodFinding[];
};

type UserDietContext = { restrictions: UserRestriction[]; diet: DietType };

async function dietContext(userId: string): Promise<UserDietContext> {
  const [restrictions, profile] = await Promise.all([
    db.dietaryRestriction.findMany({
      where: { userId },
      select: { kind: true, label: true, allergenCode: true },
    }),
    db.userProfile.findUnique({ where: { userId }, select: { dietType: true } }),
  ]);
  return { restrictions, diet: profile?.dietType ?? null };
}

function splitAllergens(rows: { allergenCode: string; presence: "CONTAINS" | "MAY_CONTAIN" }[]) {
  const pick = (presence: string) =>
    rows
      .filter((a) => a.presence === presence)
      .map((a) => a.allergenCode)
      .filter(isAllergenCode);
  return { contains: pick("CONTAINS"), mayContain: pick("MAY_CONTAIN") };
}

const MAX_QUERY = 80;

/**
 * Fuzzy, typo-tolerant search over shared foods and the user's own foods.
 * Ranking: exact everyday name (alias) > all words present > common foods >
 * trigram similarity, with a small penalty for long, very specific names.
 */
export async function searchFoods(userId: string, rawQuery: string, limit = 20): Promise<FoodSummary[]> {
  const query = rawQuery.trim().toLowerCase().slice(0, MAX_QUERY);
  if (query.length < 2) return [];
  const tokens = query
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  if (!tokens.length) return [];

  const allTokens = Prisma.join(
    tokens.map((t) => Prisma.sql`f.search_text LIKE ${"%" + t + "%"}`),
    " AND ",
  );

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT f.id
    FROM foods f
    WHERE (f.user_id IS NULL OR f.user_id = ${userId}::uuid)
      AND ((${allTokens}) OR ${query} <% f.search_text)
    ORDER BY
      (CASE WHEN ${query} = ANY (SELECT lower(a) FROM unnest(f.aliases) a) THEN 3 ELSE 0 END)
      + (CASE WHEN (${allTokens}) THEN 1 ELSE 0 END)
      + (CASE WHEN f.search_text LIKE ${query + "%"} THEN 0.5 ELSE 0 END)
      + (CASE WHEN f.is_common THEN 0.75 ELSE 0 END)
      + word_similarity(${query}, f.search_text)
      - char_length(f.name) / 400.0 DESC,
      f.name
    LIMIT ${Math.min(Math.max(limit, 1), 50)}`;

  if (!rows.length) return [];
  const foods = await db.food.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { nutrition: { select: { energyKcal: true } }, allergens: true },
  });
  const byId = new Map(foods.map((f) => [f.id, f]));
  const ctx = await dietContext(userId);

  return rows.map(({ id }) => {
    const f = byId.get(id)!;
    const findings = checkFood(
      {
        name: f.name,
        category: f.category,
        ...splitAllergens(f.allergens),
        assessment: f.allergenAssessment,
      },
      ctx.restrictions,
      ctx.diet,
    );
    return {
      id: f.id,
      name: f.name,
      category: f.category,
      source: f.source,
      isEstimate: f.isEstimate,
      energyKcalPer100g: f.nutrition?.energyKcal ?? null,
      topFinding: findings[0] ?? null,
    };
  });
}

/** Full food detail plus this user's allergy/diet findings. */
export async function getFoodDetail(userId: string, foodId: string): Promise<FoodDetail> {
  const f = await db.food.findFirst({
    where: { id: foodId, OR: [{ userId: null }, { userId }] },
    include: { nutrition: true, portions: { orderBy: { sortOrder: "asc" } }, allergens: true },
  });
  if (!f) throw new NotFoundError("Food");

  const per100g = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, f.nutrition?.[k] ?? null]),
  ) as NutrientProfile;
  const allergens = { ...splitAllergens(f.allergens), assessment: f.allergenAssessment };
  const ctx = await dietContext(userId);

  return {
    id: f.id,
    name: f.name,
    category: f.category,
    source: f.source,
    sourceVersion: f.sourceVersion,
    aliases: f.aliases,
    isEstimate: f.isEstimate,
    basis: f.basis,
    per100g,
    portions: f.portions.map((p) => ({
      unit: p.unit,
      amount: p.amount,
      gramWeight: p.gramWeight,
      label: p.label,
      isEstimate: p.isEstimate,
    })),
    allergens,
    findings: checkFood({ name: f.name, category: f.category, ...allergens }, ctx.restrictions, ctx.diet),
  };
}
