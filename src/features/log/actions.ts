"use server";

import { revalidatePath } from "next/cache";
import {
  copyMealSchema,
  entryIdSchema,
  hydrationIdSchema,
  hydrationSchema,
  logFoodSchema,
  logSavedMealSchema,
  markDaySchema,
  markSlotSchema,
  savedMealIdSchema,
  saveMealSchema,
  sleepSchema,
  updateEntrySchema,
} from "@/lib/validation/logging";
import { defineAction } from "@/server/lib/action";
import {
  copyMeal,
  deleteEntry,
  logFood,
  setDayComplete,
  setSlotSkipped,
  updateEntry,
} from "@/server/services/food-log";
import { deleteSavedMeal, logSavedMeal, saveMealFromSlot } from "@/server/services/saved-meals";
import { addWater, deleteWater, saveSleep } from "@/server/services/wellness-logs";

// Logs feed Today, Meals and history.
const refresh = () => revalidatePath("/", "layout");

export const logFoodAction = defineAction(
  logFoodSchema,
  async (input, ctx) => {
    const entry = await logFood(ctx, input);
    refresh();
    return { id: entry.id };
  },
  { name: "log.food" },
);

export const updateEntryAction = defineAction(
  updateEntrySchema,
  async (input, ctx) => {
    await updateEntry(ctx, input);
    refresh();
  },
  { name: "log.update" },
);

export const deleteEntryAction = defineAction(
  entryIdSchema,
  async ({ entryId }, ctx) => {
    await deleteEntry(ctx, entryId);
    refresh();
  },
  { name: "log.delete" },
);

export const markSlotAction = defineAction(
  markSlotSchema,
  async ({ localDate, mealSlot, skipped }, ctx) => {
    await setSlotSkipped(ctx, localDate, mealSlot, skipped);
    refresh();
  },
  { name: "log.markSlot" },
);

export const markDayAction = defineAction(
  markDaySchema,
  async ({ localDate, complete }, ctx) => {
    await setDayComplete(ctx, localDate, complete);
    refresh();
  },
  { name: "log.markDay" },
);

export const copyMealAction = defineAction(
  copyMealSchema,
  async (input, ctx) => {
    const count = await copyMeal(ctx, input);
    refresh();
    return { count };
  },
  { name: "log.copyMeal" },
);

export const saveMealAction = defineAction(
  saveMealSchema,
  async ({ name, localDate, mealSlot }, ctx) => {
    await saveMealFromSlot(ctx, name, localDate, mealSlot);
    refresh();
  },
  { name: "savedMeals.create" },
);

export const logSavedMealAction = defineAction(
  logSavedMealSchema,
  async ({ savedMealId, localDate, mealSlot }, ctx) => {
    const count = await logSavedMeal(ctx, savedMealId, localDate, mealSlot);
    refresh();
    return { count };
  },
  { name: "savedMeals.log" },
);

export const deleteSavedMealAction = defineAction(
  savedMealIdSchema,
  async ({ savedMealId }, ctx) => {
    await deleteSavedMeal(ctx, savedMealId);
    refresh();
  },
  { name: "savedMeals.delete" },
);

export const addWaterAction = defineAction(
  hydrationSchema,
  async (input, ctx) => {
    await addWater(ctx, input);
    refresh();
  },
  { name: "hydration.add" },
);

export const deleteWaterAction = defineAction(
  hydrationIdSchema,
  async ({ id }, ctx) => {
    await deleteWater(ctx, id);
    refresh();
  },
  { name: "hydration.delete" },
);

export const saveSleepAction = defineAction(
  sleepSchema,
  async (input, ctx) => {
    await saveSleep(ctx, input);
    refresh();
  },
  { name: "sleep.save" },
);
