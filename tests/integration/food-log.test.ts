import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { dailyTargetsSchema, routineSchema } from "@/lib/validation/profile";
import { logFoodSchema, updateEntrySchema } from "@/lib/validation/logging";
import { createContext, type UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { ValidationError } from "@/server/lib/errors";
import {
  copyMeal,
  deleteEntry,
  getDayLog,
  logFood,
  searchHistory,
  setDayComplete,
  setSlotSkipped,
  updateEntry,
} from "@/server/services/food-log";
import { saveRoutine } from "@/server/services/profile";
import {
  deleteSavedMeal,
  listSavedMeals,
  logSavedMeal,
  saveMealFromSlot,
} from "@/server/services/saved-meals";
import { setTargets } from "@/server/services/targets";
import { addWater, deleteWater, getHydrationDay, getSleep, saveSleep } from "@/server/services/wellness-logs";
import { seedTestCatalog } from "../fixtures/catalog";
import { createTestUser, resetDatabase } from "./helpers";

// 18:00 in Kolkata on 1 Oct 2026.
const NOW = new Date("2026-10-01T12:30:00Z");
const TODAY = "2026-10-01";
let ids: Record<string, string>;
let ctx: UserContext;

const EGG = () => ids["Egg, whole, raw, fresh"]!;
const ONION = () => ids["Onions, raw"]!;
const DOSA = () => ids["Dosa, plain (home-style)"]!;

async function userCtx(email: string): Promise<UserContext> {
  const user = await createTestUser(email);
  return createContext({ userId: user.id, now: NOW, timezone: "Asia/Kolkata" }) as UserContext;
}

const log = (c: UserContext, v: Record<string, unknown>) =>
  logFood(c, logFoodSchema.parse({ localDate: TODAY, mealSlot: "Breakfast", quantity: 1, ...v }));

beforeEach(async () => {
  await resetDatabase();
  ids = await seedTestCatalog(db);
  ctx = await userCtx("log@example.com");
  await saveRoutine(
    ctx,
    routineSchema.parse({
      mealTimes: [
        { label: "Breakfast", time: "08:00" },
        { label: "Lunch", time: "13:00" },
        { label: "Snack", time: "16:00" },
        { label: "Dinner", time: "20:00" },
      ],
    }),
  );
});
afterAll(() => db.$disconnect());

describe("logging food", () => {
  it("stores the eaten amount and its nutrients only (one serving counts once)", async () => {
    // 1 dosa portion = 55 g of a 200 kcal/100 g dish
    const entry = await log(ctx, { foodId: DOSA(), amount: { kind: "portion", portionIndex: 0 } });
    expect(entry).toMatchObject({
      grams: 55,
      isEstimate: true,
      portionLabel: "1 dosa (~55 g)",
      unit: "portion",
    });
    expect(entry.amounts.energyKcal).toBeCloseTo(110);

    const day = await getDayLog(ctx, TODAY);
    expect(day.summary.totals.energyKcal.value).toBeCloseTo(110);
  });

  it("resolves units deterministically and labels assumptions", async () => {
    const entry = await log(ctx, { foodId: EGG(), quantity: "2", amount: { kind: "unit", unit: "piece" } });
    expect(entry).toMatchObject({ grams: 88, isEstimate: true, estimateNote: "Assumed medium ones" });
    expect(entry.amounts.ironMg).toBeNull(); // unknown stays unknown
  });

  it("refuses ambiguous amounts and lists the options", async () => {
    const error = await log(ctx, { foodId: ONION(), amount: { kind: "unit", unit: "cup" } }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors.amount?.[0]).toMatch(/1 cup, chopped/);
  });

  it("refuses future days", async () => {
    await expect(
      log(ctx, { foodId: EGG(), localDate: "2026-10-02", amount: { kind: "unit", unit: "g" }, quantity: 50 }),
    ).rejects.toThrow();
  });

  it("records a chosen time in the user's timezone", async () => {
    const entry = await log(ctx, {
      foodId: EGG(),
      quantity: 50,
      amount: { kind: "unit", unit: "g" },
      eatenTime: "08:15",
    });
    expect(entry.eatenAt).toBe("2026-10-01T02:45:00.000Z");
  });
});

describe("day view", () => {
  it("separates skipped from not logged and keeps remaining honest", async () => {
    await setTargets(ctx, dailyTargetsSchema.parse({ caloriesKcal: 2000, proteinG: 100 }));
    await log(ctx, { foodId: DOSA(), quantity: 2, amount: { kind: "portion", portionIndex: 0 } });
    await setSlotSkipped(ctx, TODAY, "Lunch", true);

    const day = await getDayLog(ctx, TODAY);
    expect(day.summary.slots.map((s) => `${s.key}:${s.status}`)).toEqual([
      "Breakfast:LOGGED",
      "Lunch:SKIPPED",
      "Snack:NOT_LOGGED",
      "Dinner:UPCOMING",
    ]);
    expect(day.summary.completeness).toBe("PARTIAL");
    expect(day.summary.remaining.energyKcal).toEqual({ status: "at_most", value: 1780, over: false });
  });

  it("won't mark a meal skipped when food is logged, and logging clears a skip", async () => {
    await log(ctx, { foodId: EGG(), quantity: 50, amount: { kind: "unit", unit: "g" } });
    await expect(setSlotSkipped(ctx, TODAY, "Breakfast", true)).rejects.toThrow();

    await setSlotSkipped(ctx, TODAY, "Snack", true);
    await log(ctx, { foodId: EGG(), mealSlot: "Snack", quantity: 50, amount: { kind: "unit", unit: "g" } });
    const day = await getDayLog(ctx, TODAY);
    expect(day.summary.slots.find((s) => s.key === "Snack")!.status).toBe("LOGGED");
  });

  it("reports an unlogged day as unknown rather than zero", async () => {
    await setTargets(ctx, dailyTargetsSchema.parse({ caloriesKcal: 2000 }));
    const day = await getDayLog(ctx, TODAY);
    expect(day.summary.completeness).toBe("NONE");
    expect(day.summary.totals.energyKcal.value).toBeNull();
    expect(day.summary.remaining.energyKcal).toEqual({ status: "unknown" });
  });

  it("lets the user confirm the day is complete", async () => {
    await log(ctx, { foodId: EGG(), quantity: 50, amount: { kind: "unit", unit: "g" } });
    await setDayComplete(ctx, TODAY, true);
    expect((await getDayLog(ctx, TODAY)).summary.completeness).toBe("COMPLETE");
  });

  it("uses the targets that applied on that day", async () => {
    await setTargets(
      { ...ctx, now: new Date("2026-09-20T00:00:00Z") },
      dailyTargetsSchema.parse({ caloriesKcal: 1800 }),
    );
    await setTargets(ctx, dailyTargetsSchema.parse({ caloriesKcal: 2100 }));
    expect((await getDayLog(ctx, "2026-09-25")).targets.energyKcal).toBe(1800);
    expect((await getDayLog(ctx, TODAY)).targets.energyKcal).toBe(2100);
  });
});

describe("corrections", () => {
  it("recalculates when the amount changes (200 g → 150 g)", async () => {
    const entry = await log(ctx, { foodId: EGG(), quantity: 200, amount: { kind: "unit", unit: "g" } });
    const updated = await updateEntry(
      ctx,
      updateEntrySchema.parse({
        entryId: entry.id,
        mealSlot: "Lunch",
        quantity: 150,
        amount: { kind: "unit", unit: "g" },
      }),
    );
    expect(updated).toMatchObject({ grams: 150, mealSlot: "Lunch" });
    expect(updated.amounts.energyKcal).toBeCloseTo(214.5);
    expect((await getDayLog(ctx, TODAY)).summary.totals.energyKcal.value).toBeCloseTo(214.5);
  });

  it("scales by grams when the original food no longer exists", async () => {
    const entry = await log(ctx, { foodId: EGG(), quantity: 2, amount: { kind: "unit", unit: "piece" } });
    await db.food.delete({ where: { id: EGG() } });
    await expect(
      updateEntry(
        ctx,
        updateEntrySchema.parse({
          entryId: entry.id,
          mealSlot: "Breakfast",
          quantity: 1,
          amount: { kind: "unit", unit: "piece" },
        }),
      ),
    ).rejects.toThrow();
    const updated = await updateEntry(
      ctx,
      updateEntrySchema.parse({
        entryId: entry.id,
        mealSlot: "Breakfast",
        quantity: 44,
        amount: { kind: "unit", unit: "g" },
      }),
    );
    expect(updated).toMatchObject({ grams: 44, unit: "g", foodId: null });
    expect(updated.amounts.energyKcal).toBeCloseTo(62.92);
  });

  it("removes deleted entries from totals", async () => {
    const a = await log(ctx, { foodId: EGG(), quantity: 100, amount: { kind: "unit", unit: "g" } });
    await log(ctx, { foodId: EGG(), quantity: 50, amount: { kind: "unit", unit: "g" } });
    await deleteEntry(ctx, a.id);
    expect((await getDayLog(ctx, TODAY)).summary.totals.energyKcal.value).toBeCloseTo(71.5);
  });

  it("keeps each user's log private", async () => {
    const other = await userCtx("other@example.com");
    const entry = await log(ctx, { foodId: EGG(), quantity: 100, amount: { kind: "unit", unit: "g" } });
    await expect(deleteEntry(other, entry.id)).rejects.toThrow("not found");
    await expect(
      updateEntry(
        other,
        updateEntrySchema.parse({
          entryId: entry.id,
          mealSlot: "Lunch",
          quantity: 1,
          amount: { kind: "unit", unit: "g" },
        }),
      ),
    ).rejects.toThrow("not found");
    expect((await getDayLog(other, TODAY)).entries).toEqual([]);
  });
});

describe("re-logging", () => {
  it("copies a meal from another day", async () => {
    await log(ctx, {
      foodId: EGG(),
      localDate: "2026-09-30",
      quantity: 100,
      amount: { kind: "unit", unit: "g" },
    });
    expect(
      await copyMeal(ctx, {
        fromDate: "2026-09-30",
        fromSlot: "Breakfast",
        toDate: TODAY,
        toSlot: "Breakfast",
      }),
    ).toBe(1);
    const day = await getDayLog(ctx, TODAY);
    expect(day.entries[0]).toMatchObject({ source: "COPY", grams: 100 });
  });

  it("saves a meal and logs it again later", async () => {
    await log(ctx, { foodId: DOSA(), quantity: 2, amount: { kind: "portion", portionIndex: 0 } });
    await log(ctx, { foodId: EGG(), quantity: 2, amount: { kind: "unit", unit: "piece" } });
    await saveMealFromSlot(ctx, "My regular breakfast", TODAY, "Breakfast");
    await expect(saveMealFromSlot(ctx, "my REGULAR breakfast", TODAY, "Breakfast")).rejects.toThrow(
      /already have/,
    );

    const [meal] = await listSavedMeals(ctx.userId);
    expect(meal!.items).toHaveLength(2);
    expect(meal!.energyKcal).toBeCloseTo(220 + 125.84);

    await logSavedMeal(ctx, meal!.id, TODAY, "Dinner");
    const dinner = (await getDayLog(ctx, TODAY)).entries.filter((e) => e.mealSlot === "Dinner");
    expect(dinner.map((e) => [e.source, e.isEstimate])).toEqual([
      ["SAVED_MEAL", true],
      ["SAVED_MEAL", true],
    ]);

    await deleteSavedMeal(ctx, meal!.id);
    expect(await listSavedMeals(ctx.userId)).toEqual([]);
  });

  it("finds past meals by food name and date", async () => {
    await log(ctx, {
      foodId: DOSA(),
      localDate: "2026-09-21",
      quantity: 1,
      amount: { kind: "portion", portionIndex: 0 },
    });
    await log(ctx, {
      foodId: EGG(),
      localDate: "2026-09-28",
      quantity: 50,
      amount: { kind: "unit", unit: "g" },
    });
    const dosa = await searchHistory(ctx, { q: "dosa", from: null, to: null, mealSlot: null });
    expect(dosa.map((d) => d.date)).toEqual(["2026-09-21"]);
    const lastWeek = await searchHistory(ctx, {
      q: "",
      from: "2026-09-27",
      to: "2026-09-30",
      mealSlot: "breakfast",
    });
    expect(lastWeek.map((d) => d.date)).toEqual(["2026-09-28"]);
  });
});

describe("hydration and sleep", () => {
  it("totals water, treating no entries as unknown", async () => {
    expect((await getHydrationDay(ctx.userId, TODAY)).totalMl).toBeNull();
    const id = await addWater(ctx, { localDate: TODAY, amountMl: 500, drink: "Water" });
    await addWater(ctx, { localDate: TODAY, amountMl: 250, drink: "Water" });
    expect((await getHydrationDay(ctx.userId, TODAY)).totalMl).toBe(750);

    const other = await userCtx("w@example.com");
    await expect(deleteWater(other, id)).rejects.toThrow("not found");
    await deleteWater(ctx, id);
    expect((await getHydrationDay(ctx.userId, TODAY)).totalMl).toBe(250);
  });

  it("records sleep across midnight, one entry per morning", async () => {
    const s = await saveSleep(ctx, { localDate: TODAY, bedtime: "23:30", wakeTime: "06:45", quality: 4 });
    expect(s).toMatchObject({
      durationMin: 435,
      bedtimeAt: "2026-09-30T18:00:00.000Z",
      wokeAt: "2026-10-01T01:15:00.000Z",
    });
    await saveSleep(ctx, { localDate: TODAY, bedtime: "22:30", wakeTime: "06:30", quality: null });
    expect((await getSleep(ctx.userId, TODAY))?.durationMin).toBe(480);
    expect(await db.sleepLog.count()).toBe(1);
  });

  it("refuses sleep that hasn't ended yet", async () => {
    await expect(
      saveSleep(ctx, { localDate: TODAY, bedtime: "22:00", wakeTime: "21:00", quality: null }),
    ).rejects.toThrow();
  });
});

describe("account deletion covers logs", () => {
  it("cascades food logs, marks, day flags, saved meals, water and sleep", async () => {
    await log(ctx, { foodId: EGG(), quantity: 50, amount: { kind: "unit", unit: "g" } });
    await setSlotSkipped(ctx, TODAY, "Lunch", true);
    await setDayComplete(ctx, TODAY, true);
    await saveMealFromSlot(ctx, "Eggs", TODAY, "Breakfast");
    await addWater(ctx, { localDate: TODAY, amountMl: 300, drink: "Water" });
    await saveSleep(ctx, { localDate: TODAY, bedtime: "23:00", wakeTime: "07:00", quality: null });

    await db.user.delete({ where: { id: ctx.userId } });
    const counts = await Promise.all([
      db.foodLogEntry.count(),
      db.mealSlotMark.count(),
      db.dayLog.count(),
      db.savedMeal.count(),
      db.savedMealItem.count(),
      db.hydrationLog.count(),
      db.sleepLog.count(),
    ]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(await db.food.count()).toBeGreaterThan(0); // shared catalog untouched
  });
});
