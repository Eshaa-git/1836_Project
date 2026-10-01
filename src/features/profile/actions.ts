"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  basicsSchema,
  dailyTargetsSchema,
  extendGoalSchema,
  foodPreferencesSchema,
  goalIdSchema,
  goalSchema,
  measurementSchema,
  motivationSchema,
  routineSchema,
} from "@/lib/validation/profile";
import { defineAction } from "@/server/lib/action";
import {
  archiveGoal,
  createGoal,
  extendGoalTimeline,
  markGoalAchieved,
  updateGoal,
} from "@/server/services/goals";
import { addMeasurement, deleteMeasurement } from "@/server/services/measurements";
import {
  completeOnboarding,
  saveBasics,
  saveFoodPreferences,
  saveMotivation,
  saveRoutine,
} from "@/server/services/profile";
import { setTargets } from "@/server/services/targets";

// Profile data feeds the shell (name), Today and every profile page.
const refresh = () => revalidatePath("/", "layout");

export const saveBasicsAction = defineAction(
  basicsSchema,
  async (input, ctx) => {
    await saveBasics(ctx, input);
    refresh();
  },
  { name: "profile.saveBasics" },
);

export const saveFoodPreferencesAction = defineAction(
  foodPreferencesSchema,
  async (input, ctx) => {
    await saveFoodPreferences(ctx, input);
    refresh();
  },
  { name: "profile.saveFoodPreferences" },
);

export const saveRoutineAction = defineAction(
  routineSchema,
  async (input, ctx) => {
    await saveRoutine(ctx, input);
    refresh();
  },
  { name: "profile.saveRoutine" },
);

export const saveMotivationAction = defineAction(
  motivationSchema,
  async (input, ctx) => {
    await saveMotivation(ctx, input);
    refresh();
  },
  { name: "profile.saveMotivation" },
);

export const completeOnboardingAction = defineAction(
  z.object({}),
  async (_input, ctx) => {
    await completeOnboarding(ctx);
    refresh();
  },
  { name: "profile.completeOnboarding" },
);

export const setTargetsAction = defineAction(
  dailyTargetsSchema,
  async (input, ctx) => {
    await setTargets(ctx, input);
    refresh();
  },
  { name: "targets.set" },
);

export const addMeasurementAction = defineAction(
  measurementSchema,
  async (input, ctx) => {
    await addMeasurement(ctx, input);
    refresh();
  },
  { name: "measurements.add" },
);

export const deleteMeasurementAction = defineAction(
  z.object({ id: z.uuid() }),
  async ({ id }, ctx) => {
    await deleteMeasurement(ctx, id);
    refresh();
  },
  { name: "measurements.delete" },
);

export const createGoalAction = defineAction(
  goalSchema,
  async (input, ctx) => {
    const goal = await createGoal(ctx, input);
    refresh();
    return { id: goal.id };
  },
  { name: "goals.create" },
);

export const updateGoalAction = defineAction(
  goalSchema.extend({ goalId: z.uuid() }),
  async ({ goalId, ...input }, ctx) => {
    await updateGoal(ctx, goalId, input);
    refresh();
  },
  { name: "goals.update" },
);

export const extendGoalAction = defineAction(
  extendGoalSchema,
  async ({ goalId, targetDate, note }, ctx) => {
    await extendGoalTimeline(ctx, goalId, targetDate, note);
    refresh();
  },
  { name: "goals.extend" },
);

export const markGoalAchievedAction = defineAction(
  goalIdSchema,
  async ({ goalId }, ctx) => {
    const milestone = await markGoalAchieved(ctx, goalId);
    refresh();
    return milestone;
  },
  { name: "goals.achieve" },
);

export const archiveGoalAction = defineAction(
  goalIdSchema,
  async ({ goalId }, ctx) => {
    await archiveGoal(ctx, goalId);
    refresh();
  },
  { name: "goals.archive" },
);
