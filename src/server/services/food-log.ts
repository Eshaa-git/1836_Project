import "server-only";
import type { FoodLogEntry, Prisma } from "@/generated/prisma/client";
import {
  fromDateOnly,
  localDateIn,
  localMinutesIn,
  toDateOnly,
  zonedTimeToUtc,
  type DateOnly,
} from "@/server/domain/dates";
import { mealSlotsFor, summarizeDay, type DaySummary } from "@/server/domain/logging/day";
import { scaleProfile } from "@/server/domain/nutrition/amounts";
import { resolveGrams, type FoodPortion } from "@/server/domain/nutrition/food-units";
import { NUTRIENT_KEYS, type NutrientProfile } from "@/server/domain/nutrition/nutrients";
import type { UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type { AmountInput, LogFoodInput, UpdateEntryInput } from "@/lib/validation/logging";
import { recordAudit } from "./audit";
import { getFoodDetail } from "./foods";
import { getTargetsAt } from "./targets";

/** Largest single entry we accept (5 kg). */
const MAX_GRAMS = 5000;

export type LogEntryView = {
  id: string;
  localDate: DateOnly;
  eatenAt: string;
  mealSlot: string;
  foodId: string | null;
  foodName: string;
  quantity: number;
  unit: string;
  portionLabel: string | null;
  grams: number;
  isEstimate: boolean;
  estimateNote: string | null;
  source: FoodLogEntry["source"];
  amounts: NutrientProfile;
};

export function toEntryView(e: FoodLogEntry): LogEntryView {
  return {
    id: e.id,
    localDate: toDateOnly(e.localDate),
    eatenAt: e.eatenAt.toISOString(),
    mealSlot: e.mealSlot,
    foodId: e.foodId,
    foodName: e.foodName,
    quantity: e.quantity,
    unit: e.unit,
    portionLabel: e.portionLabel,
    grams: e.grams,
    isEstimate: e.isEstimate,
    estimateNote: e.estimateNote,
    source: e.source,
    amounts: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, e[k]])) as NutrientProfile,
  };
}

const snapshot = (amounts: NutrientProfile) => Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, amounts[k]]));

type ResolvedAmount = {
  grams: number;
  unit: string;
  portionLabel: string | null;
  isEstimate: boolean;
  note: string | null;
};

/** Deterministic quantity → grams for logging. Ambiguous amounts are refused with the options. */
export function resolveAmount(
  food: { name: string; category: string | null; portions: FoodPortion[]; isEstimate: boolean },
  quantity: number,
  amount: AmountInput,
): ResolvedAmount {
  let resolved: ResolvedAmount;
  if (amount.kind === "portion") {
    const portion = food.portions[amount.portionIndex];
    if (!portion)
      throw new ValidationError(undefined, { amount: ["That portion isn't available for this food."] });
    resolved = {
      grams: (quantity * portion.gramWeight) / portion.amount,
      unit: "portion",
      portionLabel: portion.label,
      isEstimate: Boolean(portion.isEstimate),
      note: null,
    };
  } else {
    const r = resolveGrams(food, quantity, amount.unit);
    if (!r.ok) {
      const options = r.options
        .map((o) => o.label)
        .slice(0, 4)
        .join(", ");
      throw new ValidationError(undefined, {
        amount: [options ? `${r.message} Options: ${options}.` : r.message],
      });
    }
    resolved = {
      grams: r.grams,
      unit: amount.unit,
      portionLabel: null,
      isEstimate: r.isEstimate,
      note: r.note ?? null,
    };
  }
  if (resolved.grams > MAX_GRAMS) {
    throw new ValidationError(undefined, { quantity: ["That's more than 5 kg — please check the amount."] });
  }
  return { ...resolved, isEstimate: resolved.isEstimate || food.isEstimate };
}

function eatenAtFor(ctx: UserContext, localDate: DateOnly, eatenTime: string | null): Date {
  if (eatenTime) return zonedTimeToUtc(localDate, eatenTime, ctx.timezone);
  if (localDate === localDateIn(ctx.timezone, ctx.now)) return ctx.now;
  return zonedTimeToUtc(localDate, "12:00", ctx.timezone);
}

function assertNotFuture(ctx: UserContext, localDate: DateOnly) {
  if (localDate > localDateIn(ctx.timezone, ctx.now)) {
    throw new ValidationError(undefined, { localDate: ["You can only log food for today or earlier."] });
  }
}

/** Logs food that was actually eaten. Only these entries count toward intake. */
export async function logFood(ctx: UserContext, input: LogFoodInput): Promise<LogEntryView> {
  assertNotFuture(ctx, input.localDate);
  const food = await getFoodDetail(ctx.userId, input.foodId);
  const amount = resolveAmount(food, input.quantity, input.amount);

  return db.$transaction(async (tx) => {
    const entry = await tx.foodLogEntry.create({
      data: {
        userId: ctx.userId,
        localDate: fromDateOnly(input.localDate),
        eatenAt: eatenAtFor(ctx, input.localDate, input.eatenTime),
        mealSlot: input.mealSlot,
        foodId: food.id,
        foodName: food.name,
        quantity: input.quantity,
        unit: amount.unit,
        portionLabel: amount.portionLabel,
        grams: amount.grams,
        isEstimate: amount.isEstimate,
        estimateNote: amount.note,
        note: input.note,
        ...snapshot(scaleProfile(food.per100g, amount.grams)),
      },
    });
    // Logging food in a meal means it wasn't skipped after all.
    await tx.mealSlotMark.deleteMany({
      where: { userId: ctx.userId, localDate: fromDateOnly(input.localDate), mealSlot: input.mealSlot },
    });
    await recordAudit(ctx, { action: "food_log.added", entityType: "FoodLogEntry", entityId: entry.id }, tx);
    return toEntryView(entry);
  });
}

async function ownEntry(tx: Prisma.TransactionClient | typeof db, ctx: UserContext, entryId: string) {
  const entry = await tx.foodLogEntry.findFirst({ where: { id: entryId, userId: ctx.userId } });
  if (!entry) throw new NotFoundError("Entry");
  return entry;
}

/**
 * Corrects an entry ("change my chicken from 200 g to 150 g"). Nutrients are
 * recalculated from the food; if the food no longer exists, they're scaled
 * from the original snapshot.
 */
export async function updateEntry(ctx: UserContext, input: UpdateEntryInput): Promise<LogEntryView> {
  const existing = await ownEntry(db, ctx, input.entryId);
  const localDate = toDateOnly(existing.localDate);

  let data: Prisma.FoodLogEntryUpdateInput;
  if (existing.foodId) {
    const food = await getFoodDetail(ctx.userId, existing.foodId);
    const amount = resolveAmount(food, input.quantity, input.amount);
    data = {
      quantity: input.quantity,
      unit: amount.unit,
      portionLabel: amount.portionLabel,
      grams: amount.grams,
      isEstimate: amount.isEstimate,
      estimateNote: amount.note,
      ...snapshot(scaleProfile(food.per100g, amount.grams)),
    };
  } else {
    // The food is no longer in the catalog: only a new gram amount can be applied,
    // scaling the original nutrient snapshot proportionally.
    if (input.amount.kind !== "unit" || input.amount.unit !== "g") {
      throw new ValidationError(undefined, {
        amount: ["This food is no longer in our list — enter the amount in grams."],
      });
    }
    if (input.quantity > MAX_GRAMS) {
      throw new ValidationError(undefined, {
        quantity: ["That's more than 5 kg — please check the amount."],
      });
    }
    const ratio = input.quantity / existing.grams;
    const old = toEntryView(existing).amounts;
    data = {
      quantity: input.quantity,
      unit: "g",
      portionLabel: null,
      grams: input.quantity,
      ...snapshot(
        Object.fromEntries(
          NUTRIENT_KEYS.map((k) => [k, old[k] === null ? null : old[k] * ratio]),
        ) as NutrientProfile,
      ),
    };
  }

  const updated = await db.foodLogEntry.update({
    where: { id: existing.id },
    data: {
      ...data,
      mealSlot: input.mealSlot,
      eatenAt: input.eatenTime ? zonedTimeToUtc(localDate, input.eatenTime, ctx.timezone) : existing.eatenAt,
    },
  });
  await recordAudit(ctx, { action: "food_log.updated", entityType: "FoodLogEntry", entityId: updated.id });
  return toEntryView(updated);
}

export async function deleteEntry(ctx: UserContext, entryId: string) {
  const entry = await ownEntry(db, ctx, entryId);
  await db.foodLogEntry.delete({ where: { id: entry.id } });
  await recordAudit(ctx, { action: "food_log.deleted", entityType: "FoodLogEntry", entityId: entry.id });
}

export async function getEntry(ctx: UserContext, entryId: string): Promise<LogEntryView> {
  return toEntryView(await ownEntry(db, ctx, entryId));
}

/** "I skipped this meal" (or undo). Only allowed for meals with nothing logged. */
export async function setSlotSkipped(
  ctx: UserContext,
  localDate: DateOnly,
  mealSlot: string,
  skipped: boolean,
) {
  assertNotFuture(ctx, localDate);
  const where = { userId: ctx.userId, localDate: fromDateOnly(localDate), mealSlot };
  if (!skipped) {
    await db.mealSlotMark.deleteMany({ where });
    return;
  }
  if (await db.foodLogEntry.count({ where })) {
    throw new ValidationError(undefined, { mealSlot: ["This meal has food logged, so it wasn't skipped."] });
  }
  await db.mealSlotMark.upsert({
    where: { userId_localDate_mealSlot: where },
    create: { ...where, mark: "SKIPPED" },
    update: { mark: "SKIPPED" },
  });
}

/** "I've logged everything I ate today" (or undo). */
export async function setDayComplete(ctx: UserContext, localDate: DateOnly, complete: boolean) {
  assertNotFuture(ctx, localDate);
  const key = { userId: ctx.userId, localDate: fromDateOnly(localDate) };
  await db.dayLog.upsert({
    where: { userId_localDate: key },
    create: { ...key, completedAt: complete ? ctx.now : null },
    update: { completedAt: complete ? ctx.now : null },
  });
}

/** Copies a meal's entries to another day/meal ("same breakfast as yesterday"). */
export async function copyMeal(
  ctx: UserContext,
  input: { fromDate: DateOnly; fromSlot: string; toDate: DateOnly; toSlot: string },
): Promise<number> {
  assertNotFuture(ctx, input.toDate);
  const source = await db.foodLogEntry.findMany({
    where: { userId: ctx.userId, localDate: fromDateOnly(input.fromDate), mealSlot: input.fromSlot },
    orderBy: { eatenAt: "asc" },
  });
  if (!source.length)
    throw new ValidationError(undefined, { fromSlot: ["There's nothing logged in that meal to copy."] });

  const eatenAt = eatenAtFor(ctx, input.toDate, null);
  await db.$transaction(async (tx) => {
    await tx.foodLogEntry.createMany({
      data: source.map((e) => ({
        userId: ctx.userId,
        localDate: fromDateOnly(input.toDate),
        eatenAt,
        mealSlot: input.toSlot,
        foodId: e.foodId,
        foodName: e.foodName,
        quantity: e.quantity,
        unit: e.unit,
        portionLabel: e.portionLabel,
        grams: e.grams,
        isEstimate: e.isEstimate,
        estimateNote: e.estimateNote,
        source: "COPY" as const,
        ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, e[k]])),
      })),
    });
    await tx.mealSlotMark.deleteMany({
      where: { userId: ctx.userId, localDate: fromDateOnly(input.toDate), mealSlot: input.toSlot },
    });
    await recordAudit(ctx, { action: "food_log.copied", metadata: { count: source.length } }, tx);
  });
  return source.length;
}

export type DayLogView = {
  date: DateOnly;
  isToday: boolean;
  summary: DaySummary;
  entries: LogEntryView[];
  targets: Partial<Record<keyof NutrientProfile, number | null>> & {
    waterMl?: number | null;
    sleepHours?: number | null;
  };
  markedComplete: boolean;
};

/** Everything for one day's food log: meal statuses, entries, totals and what remains. */
export async function getDayLog(ctx: UserContext, date: DateOnly): Promise<DayLogView> {
  const today = localDateIn(ctx.timezone, ctx.now);
  const dateKey = fromDateOnly(date);
  // Targets that applied on that day (history-aware), at local noon.
  const targetsAt = date === today ? ctx.now : zonedTimeToUtc(date, "12:00", ctx.timezone);

  const [profile, entries, marks, dayLog, targets] = await Promise.all([
    db.userProfile.findUnique({
      where: { userId: ctx.userId },
      select: { mealTimes: true, mealsPerDay: true, wakeTime: true, bedTime: true },
    }),
    db.foodLogEntry.findMany({
      where: { userId: ctx.userId, localDate: dateKey },
      orderBy: { eatenAt: "asc" },
    }),
    db.mealSlotMark.findMany({ where: { userId: ctx.userId, localDate: dateKey } }),
    db.dayLog.findUnique({ where: { userId_localDate: { userId: ctx.userId, localDate: dateKey } } }),
    getTargetsAt(ctx.userId, targetsAt),
  ]);

  const mealTimes = Array.isArray(profile?.mealTimes)
    ? (profile.mealTimes as { label: string; time: string }[])
    : [];
  const views = entries.map(toEntryView);
  const nutrientTargets = {
    energyKcal: targets?.caloriesKcal ?? null,
    proteinG: targets?.proteinG ?? null,
    carbsG: targets?.carbsG ?? null,
    fatG: targets?.fatG ?? null,
    fiberG: targets?.fiberG ?? null,
  };

  const summary = summarizeDay({
    date,
    now: { date: today, minutes: localMinutesIn(ctx.timezone, ctx.now) },
    slots: mealSlotsFor({
      mealTimes,
      mealsPerDay: profile?.mealsPerDay ?? null,
      wakeTime: profile?.wakeTime ?? null,
      bedTime: profile?.bedTime ?? null,
    }),
    items: views.map((e) => ({
      id: e.id,
      mealSlot: e.mealSlot,
      amounts: e.amounts,
      isEstimate: e.isEstimate,
    })),
    skipped: marks.map((m) => m.mealSlot),
    markedComplete: Boolean(dayLog?.completedAt),
    targets: nutrientTargets,
  });

  return {
    date,
    isToday: date === today,
    summary,
    entries: views,
    targets: {
      ...nutrientTargets,
      waterMl: targets?.waterMl ?? null,
      sleepHours: targets?.sleepHours ?? null,
    },
    markedComplete: Boolean(dayLog?.completedAt),
  };
}

export type HistoryDay = { date: DateOnly; entries: LogEntryView[] };

/**
 * Searchable history: "When did I last eat dosa?", "What was breakfast last
 * Monday?". Newest first, grouped by day.
 */
export async function searchHistory(
  ctx: UserContext,
  query: { q: string; from: DateOnly | null; to: DateOnly | null; mealSlot: string | null },
  limit = 200,
): Promise<HistoryDay[]> {
  const q = query.q.trim().toLowerCase();
  const entries = await db.foodLogEntry.findMany({
    where: {
      userId: ctx.userId,
      ...(q ? { foodName: { contains: q, mode: "insensitive" as const } } : {}),
      ...(query.mealSlot ? { mealSlot: { equals: query.mealSlot, mode: "insensitive" as const } } : {}),
      localDate: {
        ...(query.from ? { gte: fromDateOnly(query.from) } : {}),
        ...(query.to ? { lte: fromDateOnly(query.to) } : {}),
      },
    },
    orderBy: [{ localDate: "desc" }, { eatenAt: "asc" }],
    take: Math.min(limit, 500),
  });
  const days = new Map<DateOnly, LogEntryView[]>();
  for (const e of entries.map(toEntryView)) {
    days.set(e.localDate, [...(days.get(e.localDate) ?? []), e]);
  }
  return [...days.entries()].map(([date, list]) => ({ date, entries: list }));
}

/** Foods this user logged most recently (distinct), for quick re-logging. */
export async function recentFoods(
  userId: string,
  limit = 8,
): Promise<{ foodId: string; foodName: string }[]> {
  const rows = await db.foodLogEntry.findMany({
    where: { userId, foodId: { not: null } },
    orderBy: { eatenAt: "desc" },
    select: { foodId: true, foodName: true },
    take: 100,
  });
  const seen = new Set<string>();
  const result: { foodId: string; foodName: string }[] = [];
  for (const r of rows) {
    if (!r.foodId || seen.has(r.foodId)) continue;
    seen.add(r.foodId);
    result.push({ foodId: r.foodId, foodName: r.foodName });
    if (result.length === limit) break;
  }
  return result;
}

/** The user's meal names in order ("Breakfast", "Lunch", …) for meal pickers. */
export async function mealSlotLabels(userId: string): Promise<string[]> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { mealTimes: true, mealsPerDay: true, wakeTime: true, bedTime: true },
  });
  return mealSlotsFor({
    mealTimes: Array.isArray(profile?.mealTimes)
      ? (profile.mealTimes as { label: string; time: string }[])
      : [],
    mealsPerDay: profile?.mealsPerDay ?? null,
    wakeTime: profile?.wakeTime ?? null,
    bedTime: profile?.bedTime ?? null,
  }).map((s) => s.key);
}
