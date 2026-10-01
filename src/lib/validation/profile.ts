import { z } from "zod";
import { isAllergenCode } from "@/server/domain/dietary/allergens";
import { isDateOnly, isTimeOfDay, isValidTimezone } from "@/server/domain/dates";

/**
 * Input schemas for profile, restrictions, routine, motivation, measurements,
 * targets and goals. Shared by client forms and server actions.
 * All quantities arrive metric; forms convert imperial input before sending.
 */

/** Empty string / undefined → null, otherwise a number within range. */
const optionalNumber = (min: number, max: number, label: string, int = false) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? Number(v) : v),
    z
      .number({ error: `${label} must be a number.` })
      .refine((n) => !int || Number.isInteger(n), `${label} must be a whole number.`)
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} must be at most ${max}.`)
      .nullable(),
  );

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max, `Keep it under ${max} characters.`).nullable().default(null),
  );

const dateOnly = z.string().refine(isDateOnly, "Enter a valid date.");
const optionalDateOnly = z.preprocess((v) => (v === "" ? null : v), dateOnly.nullable().default(null));
const timeOfDay = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().refine(isTimeOfDay, "Use a time like 07:30.").nullable().default(null),
);

export const SEX_VALUES = ["FEMALE", "MALE", "INTERSEX", "PREFER_NOT_TO_SAY"] as const;
export const MEASUREMENT_SYSTEMS = ["METRIC", "IMPERIAL"] as const;
export const ACTIVITY_LEVELS = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"] as const;
export const DIET_TYPES = ["OMNIVORE", "VEGETARIAN", "EGGETARIAN", "VEGAN", "PESCATARIAN", "OTHER"] as const;
export const RESTRICTION_KINDS = ["ALLERGY", "INTOLERANCE", "AVOID", "OTHER"] as const;
export const ALLERGY_SEVERITIES = ["MILD", "MODERATE", "SEVERE", "UNKNOWN"] as const;
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export const GOAL_TYPES = [
  "FAT_LOSS",
  "WEIGHT_LOSS",
  "MAINTENANCE",
  "MUSCLE_GAIN",
  "STRENGTH",
  "GENERAL_FITNESS",
] as const;
export const GOAL_METRICS = [
  "BODY_WEIGHT_KG",
  "BODY_FAT_PCT",
  "WAIST_CM",
  "WORKOUTS_PER_WEEK",
  "NONE",
] as const;
export const CUISINES = [
  "Indian",
  "Mediterranean",
  "Mexican",
  "Italian",
  "Chinese",
  "Japanese",
  "Thai",
  "Korean",
  "American",
  "Middle Eastern",
  "French",
  "African",
] as const;

// ─── Basics ──────────────────────────────────────────────────────────────────

export const basicsSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you.").max(80),
  birthDate: dateOnly.refine((d) => {
    const year = Number(d.slice(0, 4));
    const now = new Date().getUTCFullYear();
    return year <= now - 13 && year >= now - 110;
  }, "You need to be at least 13 to use Nourish."),
  sex: z.enum(SEX_VALUES).nullable().default(null),
  heightCm: z.coerce
    .number({ error: "Enter your height." })
    .min(50, "Height looks too low.")
    .max(272, "Height looks too high."),
  weightKg: optionalNumber(20, 400, "Weight"),
  measurementSystem: z.enum(MEASUREMENT_SYSTEMS),
  timezone: z.string().refine(isValidTimezone, "Choose a valid timezone."),
});
export type BasicsInput = z.infer<typeof basicsSchema>;

// ─── Food preferences and restrictions ──────────────────────────────────────

export const restrictionSchema = z
  .object({
    kind: z.enum(RESTRICTION_KINDS),
    label: z.string().trim().min(1, "Describe the food.").max(60),
    allergenCode: z.string().refine(isAllergenCode, "Unknown allergen.").nullable().default(null),
    severity: z.enum(ALLERGY_SEVERITIES).nullable().default(null),
    note: optionalText(200),
  })
  .transform((r) => ({
    ...r,
    // Severity only applies to allergies; allergen codes to allergies and intolerances.
    severity: r.kind === "ALLERGY" ? (r.severity ?? "UNKNOWN") : null,
    allergenCode: r.kind === "ALLERGY" || r.kind === "INTOLERANCE" ? r.allergenCode : null,
  }));
export type RestrictionInput = z.infer<typeof restrictionSchema>;

export const foodPreferencesSchema = z
  .object({
    dietType: z.enum(DIET_TYPES).nullable().default(null),
    dietTypeOther: optionalText(60),
    cuisines: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    preferredFoods: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
    restrictions: z.array(restrictionSchema).max(60).default([]),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.restrictions.forEach((r, i) => {
      const key = `${r.kind}:${r.label.toLowerCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["restrictions", i, "label"],
          message: `"${r.label}" is listed twice.`,
        });
      }
      seen.add(key);
    });
  });
export type FoodPreferencesInput = z.infer<typeof foodPreferencesSchema>;

// ─── Routine ────────────────────────────────────────────────────────────────

export const routineSchema = z.object({
  activityLevel: z.enum(ACTIVITY_LEVELS).nullable().default(null),
  mealsPerDay: optionalNumber(1, 8, "Meals per day", true),
  wakeTime: timeOfDay,
  bedTime: timeOfDay,
  workoutTime: timeOfDay,
  workoutDurationMin: optionalNumber(5, 300, "Workout duration", true),
  workoutDays: z.array(z.enum(WEEKDAYS)).max(7).default([]),
  workSchedule: optionalText(200),
  mealTimes: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(30),
        time: z.string().refine(isTimeOfDay, "Use HH:MM."),
      }),
    )
    .max(8)
    .default([]),
});
export type RoutineInput = z.infer<typeof routineSchema>;

// ─── Motivation ─────────────────────────────────────────────────────────────

export const motivationSchema = z.object({
  motivationWhy: optionalText(500),
  roleModel: optionalText(80),
});
export type MotivationInput = z.infer<typeof motivationSchema>;

// ─── Body measurements ──────────────────────────────────────────────────────

export const measurementSchema = z
  .object({
    localDate: dateOnly,
    weightKg: optionalNumber(20, 400, "Weight"),
    bodyFatPct: optionalNumber(2, 75, "Body fat"),
    waistCm: optionalNumber(30, 300, "Waist"),
    hipCm: optionalNumber(30, 300, "Hips"),
    chestCm: optionalNumber(30, 300, "Chest"),
    armCm: optionalNumber(10, 100, "Arm"),
    thighCm: optionalNumber(20, 150, "Thigh"),
    note: optionalText(200),
  })
  .refine(
    (m) =>
      [m.weightKg, m.bodyFatPct, m.waistCm, m.hipCm, m.chestCm, m.armCm, m.thighCm].some((v) => v !== null),
    { message: "Enter at least one measurement.", path: ["weightKg"] },
  );
export type MeasurementInput = z.infer<typeof measurementSchema>;

// ─── Daily targets ──────────────────────────────────────────────────────────

export const dailyTargetsSchema = z.object({
  caloriesKcal: optionalNumber(1, 20000, "Calories", true),
  proteinG: optionalNumber(0, 2000, "Protein"),
  carbsG: optionalNumber(0, 5000, "Carbs"),
  fatG: optionalNumber(0, 2000, "Fat"),
  fiberG: optionalNumber(0, 1000, "Fiber"),
  waterMl: optionalNumber(0, 50000, "Water", true),
  sleepHours: optionalNumber(0, 24, "Sleep"),
  reason: optionalText(200),
  acknowledgedWarnings: z.array(z.string().max(60)).max(20).default([]),
});
export type DailyTargetsFormInput = z.infer<typeof dailyTargetsSchema>;

// ─── Goals ──────────────────────────────────────────────────────────────────

export const goalSchema = z.object({
  type: z.enum(GOAL_TYPES),
  metric: z.enum(GOAL_METRICS).default("NONE"),
  title: optionalText(80),
  /** Used only when there is no measurement to start from. */
  startValue: optionalNumber(1, 400, "Starting value"),
  targetValue: optionalNumber(1, 400, "Target"),
  targetDate: optionalDateOnly,
  workoutsPerWeek: optionalNumber(1, 14, "Workouts per week", true),
  acknowledgedWarnings: z.array(z.string().max(60)).max(20).default([]),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const goalIdSchema = z.object({ goalId: z.uuid() });

export const extendGoalSchema = z.object({
  goalId: z.uuid(),
  targetDate: dateOnly,
  note: optionalText(200),
});
