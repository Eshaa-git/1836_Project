import "server-only";
import { localDateIn } from "@/server/domain/dates";
import type { UserContext } from "@/server/lib/context";
import { evaluateActiveGoal } from "@/server/services/goals";
import { latestMetricValue } from "@/server/services/measurements";
import { getProfileView, type ProfileView } from "@/server/services/profile";
import { getCurrentTargets } from "@/server/services/targets";
import type { BasicsInitial } from "./components/basics-form";
import type { FoodPreferencesInitial } from "./components/food-preferences-form";
import type { GoalFormContext, GoalInitial } from "./components/goal-form";
import type { RoutineInitial } from "./components/routine-form";

/** Loads the profile once and shapes the initial values for every profile form. */
export async function loadProfileForms(ctx: UserContext) {
  const today = localDateIn(ctx.timezone, ctx.now);
  const [profile, targets, goalState, bodyFat, waist] = await Promise.all([
    getProfileView(ctx.userId, today),
    getCurrentTargets(ctx.userId),
    evaluateActiveGoal(ctx),
    latestMetricValue(ctx.userId, "BODY_FAT_PCT"),
    latestMetricValue(ctx.userId, "WAIST_CM"),
  ]);

  const basics: BasicsInitial = {
    name: profile.name,
    birthDate: profile.birthDate,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.latestWeight?.value ?? null,
    measurementSystem: profile.measurementSystem,
    timezone: profile.timezone,
    exists: profile.exists,
  };

  const food: FoodPreferencesInitial = {
    dietType: profile.dietType,
    dietTypeOther: profile.dietTypeOther,
    cuisines: profile.cuisines,
    preferredFoods: profile.preferredFoods,
    restrictions: profile.restrictions,
  };

  const routine: RoutineInitial = {
    activityLevel: profile.activityLevel,
    mealsPerDay: profile.mealsPerDay,
    wakeTime: profile.wakeTime,
    bedTime: profile.bedTime,
    workoutTime: profile.workoutTime,
    workoutDurationMin: profile.workoutDurationMin,
    workoutDays: profile.workoutDays,
    workSchedule: profile.workSchedule,
    mealTimes: profile.mealTimes,
  };

  const goalContext: GoalFormContext = {
    today,
    system: profile.measurementSystem,
    heightCm: profile.heightCm,
    age: profile.age,
    latest: {
      BODY_WEIGHT_KG: profile.latestWeight?.value ?? null,
      BODY_FAT_PCT: bodyFat?.value ?? null,
      WAIST_CM: waist?.value ?? null,
    },
  };

  const goal: GoalInitial | undefined = goalState
    ? {
        id: goalState.goal.id,
        type: goalState.goal.type,
        metric: goalState.goal.metric,
        title: goalState.goal.title,
        startValue: goalState.goal.startValue,
        targetValue: goalState.goal.targetValue,
        startDate: goalState.goal.startDate,
        targetDate: goalState.goal.targetDate,
        workoutsPerWeek: goalState.goal.workoutsPerWeek,
      }
    : undefined;

  return {
    today,
    profile,
    basics,
    food,
    routine,
    motivation: { motivationWhy: profile.motivationWhy, roleModel: profile.roleModel },
    targets,
    targetSafety: targetSafetyContext(profile),
    goal,
    goalState,
    goalContext,
  };
}

export function targetSafetyContext(profile: ProfileView) {
  return { sex: profile.sex, age: profile.age, weightKg: profile.latestWeight?.value ?? null };
}
