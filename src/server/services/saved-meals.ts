import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { fromDateOnly, localDateIn, zonedTimeToUtc, type DateOnly } from "@/server/domain/dates";
import { scaleProfile } from "@/server/domain/nutrition/amounts";
import { NUTRIENT_KEYS, type NutrientProfile } from "@/server/domain/nutrition/nutrients";
import type { UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { recordAudit } from "./audit";

export type SavedMealView = {
  id: string;
  name: string;
  defaultSlot: string | null;
  items: { foodName: string; quantity: number; unit: string; portionLabel: string | null; grams: number }[];
  energyKcal: number | null;
};

/** Saves the foods logged in one meal as a reusable meal ("My regular breakfast"). */
export async function saveMealFromSlot(
  ctx: UserContext,
  name: string,
  localDate: DateOnly,
  mealSlot: string,
) {
  const entries = await db.foodLogEntry.findMany({
    where: { userId: ctx.userId, localDate: fromDateOnly(localDate), mealSlot },
    orderBy: { eatenAt: "asc" },
  });
  if (!entries.length)
    throw new ValidationError(undefined, { mealSlot: ["Log some food in this meal first."] });
  try {
    const meal = await db.savedMeal.create({
      data: {
        userId: ctx.userId,
        name,
        defaultSlot: mealSlot,
        items: {
          create: entries.map((e, i) => ({
            foodId: e.foodId,
            foodName: e.foodName,
            quantity: e.quantity,
            unit: e.unit,
            portionLabel: e.portionLabel,
            grams: e.grams,
            isEstimate: e.isEstimate,
            sortOrder: i,
          })),
        },
      },
    });
    await recordAudit(ctx, { action: "saved_meal.created", entityType: "SavedMeal", entityId: meal.id });
    return meal.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError(`You already have a saved meal called “${name}”.`);
    }
    throw e;
  }
}

export async function listSavedMeals(userId: string): Promise<SavedMealView[]> {
  const meals = await db.savedMeal.findMany({
    where: { userId },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { food: { include: { nutrition: true } } } },
    },
    orderBy: [{ lastUsedAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
  });
  return meals.map((m) => {
    const kcal = m.items.map((i) =>
      i.food?.nutrition?.energyKcal == null ? null : (i.food.nutrition.energyKcal * i.grams) / 100,
    );
    return {
      id: m.id,
      name: m.name,
      defaultSlot: m.defaultSlot,
      items: m.items.map((i) => ({
        foodName: i.foodName,
        quantity: i.quantity,
        unit: i.unit,
        portionLabel: i.portionLabel,
        grams: i.grams,
      })),
      // Unknown if any item's calories are unknown.
      energyKcal: kcal.some((k) => k === null) ? null : kcal.reduce<number>((a, b) => a + (b ?? 0), 0),
    };
  });
}

/**
 * Logs a saved meal ("I had my regular breakfast"). Nutrients are recalculated
 * from current food data for the saved gram amounts.
 */
export async function logSavedMeal(
  ctx: UserContext,
  savedMealId: string,
  localDate: DateOnly,
  mealSlot: string,
) {
  if (localDate > localDateIn(ctx.timezone, ctx.now)) {
    throw new ValidationError(undefined, { localDate: ["You can only log food for today or earlier."] });
  }
  const meal = await db.savedMeal.findFirst({
    where: { id: savedMealId, userId: ctx.userId },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { food: { include: { nutrition: true } } } },
    },
  });
  if (!meal) throw new NotFoundError("Saved meal");

  await db.$transaction(async (tx) => {
    await tx.foodLogEntry.createMany({
      data: meal.items.map((i) => {
        const per100g = Object.fromEntries(
          NUTRIENT_KEYS.map((k) => [k, i.food?.nutrition?.[k] ?? null]),
        ) as NutrientProfile;
        return {
          userId: ctx.userId,
          localDate: fromDateOnly(localDate),
          eatenAt:
            localDate === localDateIn(ctx.timezone, ctx.now)
              ? ctx.now
              : zonedTimeToUtc(localDate, "12:00", ctx.timezone),
          mealSlot,
          foodId: i.foodId,
          foodName: i.foodName,
          quantity: i.quantity,
          unit: i.unit,
          portionLabel: i.portionLabel,
          grams: i.grams,
          isEstimate: i.isEstimate || Boolean(i.food?.isEstimate),
          source: "SAVED_MEAL" as const,
          ...scaleProfile(per100g, i.grams),
        };
      }),
    });
    await tx.mealSlotMark.deleteMany({
      where: { userId: ctx.userId, localDate: fromDateOnly(localDate), mealSlot },
    });
    await tx.savedMeal.update({ where: { id: meal.id }, data: { lastUsedAt: ctx.now } });
    await recordAudit(ctx, { action: "saved_meal.logged", entityType: "SavedMeal", entityId: meal.id }, tx);
  });
  return meal.items.length;
}

export async function deleteSavedMeal(ctx: UserContext, savedMealId: string) {
  const { count } = await db.savedMeal.deleteMany({ where: { id: savedMealId, userId: ctx.userId } });
  if (!count) throw new NotFoundError("Saved meal");
  await recordAudit(ctx, { action: "saved_meal.deleted", entityType: "SavedMeal", entityId: savedMealId });
}
