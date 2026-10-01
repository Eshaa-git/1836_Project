import { z } from "zod";
import { isDateOnly, isTimeOfDay } from "@/server/domain/dates";
import { parseQuantity } from "@/server/domain/nutrition/food-units";

/** Schemas for food, water and sleep logging. Shared by forms and server actions. */

const dateOnly = z.string().refine(isDateOnly, "Enter a valid date.");
const timeOfDay = z.string().refine(isTimeOfDay, "Use a time like 08:30.");

/** Accepts 2, "2", "1/2", "1 1/2", "½", "half". */
export const quantitySchema = z.preprocess(
  (v) => (typeof v === "number" ? v : typeof v === "string" ? parseQuantity(v) : null),
  z
    .number({ error: "Enter an amount like 1, 1.5 or 1/2." })
    .positive("Enter an amount greater than zero.")
    .max(10000, "That amount looks too large."),
);

/** Either one of the food's own portions (by position) or a unit word. */
export const amountSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("portion"), portionIndex: z.number().int().min(0).max(100) }),
  z.object({ kind: z.literal("unit"), unit: z.string().trim().min(1).max(30) }),
]);
export type AmountInput = z.infer<typeof amountSchema>;

const mealSlot = z.string().trim().min(1, "Choose a meal.").max(40);

export const logFoodSchema = z.object({
  foodId: z.uuid(),
  localDate: dateOnly,
  mealSlot,
  quantity: quantitySchema,
  amount: amountSchema,
  eatenTime: timeOfDay.nullable().default(null),
  note: z.string().trim().max(200).nullable().default(null),
});
export type LogFoodInput = z.infer<typeof logFoodSchema>;

export const updateEntrySchema = z.object({
  entryId: z.uuid(),
  mealSlot,
  quantity: quantitySchema,
  amount: amountSchema,
  eatenTime: timeOfDay.nullable().default(null),
});
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export const entryIdSchema = z.object({ entryId: z.uuid() });

export const markSlotSchema = z.object({ localDate: dateOnly, mealSlot, skipped: z.boolean() });
export const markDaySchema = z.object({ localDate: dateOnly, complete: z.boolean() });

export const saveMealSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(60),
  localDate: dateOnly,
  mealSlot,
});

export const logSavedMealSchema = z.object({ savedMealId: z.uuid(), localDate: dateOnly, mealSlot });
export const savedMealIdSchema = z.object({ savedMealId: z.uuid() });

export const copyMealSchema = z.object({
  fromDate: dateOnly,
  fromSlot: mealSlot,
  toDate: dateOnly,
  toSlot: mealSlot,
});

export const hydrationSchema = z.object({
  localDate: dateOnly,
  amountMl: z.coerce
    .number({ error: "Enter an amount in ml." })
    .int("Use whole millilitres.")
    .min(10, "At least 10 ml.")
    .max(5000, "Log up to 5,000 ml at a time."),
  drink: z.string().trim().min(1).max(40).default("Water"),
});

export const hydrationIdSchema = z.object({ id: z.uuid() });

export const sleepSchema = z.object({
  localDate: dateOnly,
  bedtime: timeOfDay,
  wakeTime: timeOfDay,
  quality: z.coerce.number().int().min(1).max(5).nullable().default(null),
});

export const historyQuerySchema = z.object({
  q: z.string().trim().max(80).default(""),
  from: dateOnly.nullable().default(null),
  to: dateOnly.nullable().default(null),
  mealSlot: z.string().trim().max(40).nullable().default(null),
});
