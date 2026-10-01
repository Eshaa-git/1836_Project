import "server-only";
import type { DietaryRestriction, Prisma, UserProfile } from "@/generated/prisma/client";
import { ageOn, fromDateOnly, localDateIn, toDateOnly, type DateOnly } from "@/server/domain/dates";
import type { UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { num } from "@/server/lib/decimal";
import type {
  BasicsInput,
  FoodPreferencesInput,
  MotivationInput,
  RoutineInput,
} from "@/lib/validation/profile";
import { recordAudit } from "./audit";
import { addMeasurement, latestMetricValue } from "./measurements";

export type RestrictionView = {
  id: string;
  kind: DietaryRestriction["kind"];
  label: string;
  allergenCode: string | null;
  severity: DietaryRestriction["severity"];
  note: string | null;
};

export type ProfileView = {
  name: string;
  email: string;
  birthDate: DateOnly | null;
  age: number | null;
  sex: UserProfile["sex"];
  heightCm: number | null;
  measurementSystem: UserProfile["measurementSystem"];
  timezone: string;
  latestWeight: { value: number; localDate: DateOnly } | null;
  dietType: UserProfile["dietType"];
  dietTypeOther: string | null;
  cuisines: string[];
  preferredFoods: string[];
  restrictions: RestrictionView[];
  activityLevel: UserProfile["activityLevel"];
  mealsPerDay: number | null;
  wakeTime: string | null;
  bedTime: string | null;
  workoutTime: string | null;
  workoutDurationMin: number | null;
  workoutDays: string[];
  workSchedule: string | null;
  mealTimes: { label: string; time: string }[];
  motivationWhy: string | null;
  roleModel: string | null;
  onboardingCompleted: boolean;
  exists: boolean;
};

const RESTRICTION_ORDER = { ALLERGY: 0, INTOLERANCE: 1, AVOID: 2, OTHER: 3 } as const;

/** Everything the profile screens need, as plain serializable values. */
export async function getProfileView(userId: string, today: DateOnly): Promise<ProfileView> {
  const [user, profile, restrictions, latestWeight] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
    db.userProfile.findUnique({ where: { userId } }),
    db.dietaryRestriction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    latestMetricValue(userId, "BODY_WEIGHT_KG"),
  ]);
  const birthDate = profile?.birthDate ? toDateOnly(profile.birthDate) : null;

  return {
    name: user.name,
    email: user.email,
    birthDate,
    age: birthDate ? ageOn(birthDate, today) : null,
    sex: profile?.sex ?? null,
    heightCm: num(profile?.heightCm),
    measurementSystem: profile?.measurementSystem ?? "METRIC",
    timezone: profile?.timezone ?? "UTC",
    latestWeight,
    dietType: profile?.dietType ?? null,
    dietTypeOther: profile?.dietTypeOther ?? null,
    cuisines: profile?.cuisines ?? [],
    preferredFoods: profile?.preferredFoods ?? [],
    restrictions: restrictions
      .sort((a, b) => RESTRICTION_ORDER[a.kind] - RESTRICTION_ORDER[b.kind])
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        label: r.label,
        allergenCode: r.allergenCode,
        severity: r.severity,
        note: r.note,
      })),
    activityLevel: profile?.activityLevel ?? null,
    mealsPerDay: profile?.mealsPerDay ?? null,
    wakeTime: profile?.wakeTime ?? null,
    bedTime: profile?.bedTime ?? null,
    workoutTime: profile?.workoutTime ?? null,
    workoutDurationMin: profile?.workoutDurationMin ?? null,
    workoutDays: profile?.workoutDays ?? [],
    workSchedule: profile?.workSchedule ?? null,
    mealTimes: parseMealTimes(profile?.mealTimes),
    motivationWhy: profile?.motivationWhy ?? null,
    roleModel: profile?.roleModel ?? null,
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    exists: Boolean(profile),
  };
}

function parseMealTimes(value: Prisma.JsonValue | undefined): { label: string; time: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is { label: string; time: string } =>
      typeof v === "object" && v !== null && "label" in v && "time" in v,
  );
}

export async function getOnboardingStatus(userId: string) {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { onboardingCompletedAt: true, birthDate: true },
  });
  return { hasBasics: Boolean(profile?.birthDate), completed: Boolean(profile?.onboardingCompletedAt) };
}

/**
 * Saves the required basics. A weight, when given, is recorded as today's body
 * measurement (updating today's weight if one was already entered).
 */
export async function saveBasics(ctx: UserContext, input: BasicsInput) {
  const today = localDateIn(input.timezone, ctx.now);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: ctx.userId }, data: { name: input.name } });
    const data = {
      birthDate: fromDateOnly(input.birthDate),
      sex: input.sex,
      heightCm: input.heightCm,
      measurementSystem: input.measurementSystem,
      timezone: input.timezone,
    };
    await tx.userProfile.upsert({
      where: { userId: ctx.userId },
      create: { userId: ctx.userId, ...data },
      update: data,
    });

    if (input.weightKg !== null) {
      const existing = await tx.bodyMeasurement.findFirst({
        where: { userId: ctx.userId, localDate: fromDateOnly(today), weightKg: { not: null } },
        orderBy: { measuredAt: "desc" },
      });
      if (existing) {
        await tx.bodyMeasurement.update({ where: { id: existing.id }, data: { weightKg: input.weightKg } });
      } else {
        await addMeasurement(
          { ...ctx, timezone: input.timezone },
          emptyMeasurement(today, input.weightKg),
          tx,
        );
      }
    }
    await recordAudit(
      ctx,
      { action: "profile.basics_saved", entityType: "UserProfile", entityId: ctx.userId },
      tx,
    );
  });
}

function emptyMeasurement(localDate: DateOnly, weightKg: number) {
  return {
    localDate,
    weightKg,
    bodyFatPct: null,
    waistCm: null,
    hipCm: null,
    chestCm: null,
    armCm: null,
    thighCm: null,
    note: null,
  };
}

/** Replaces food preferences and the full restriction list atomically. */
export async function saveFoodPreferences(ctx: UserContext, input: FoodPreferencesInput) {
  await db.$transaction(async (tx) => {
    await ensureProfile(tx, ctx.userId);
    await tx.userProfile.update({
      where: { userId: ctx.userId },
      data: {
        dietType: input.dietType,
        dietTypeOther: input.dietType === "OTHER" ? input.dietTypeOther : null,
        cuisines: dedupe(input.cuisines),
        preferredFoods: dedupe(input.preferredFoods),
      },
    });
    await tx.dietaryRestriction.deleteMany({ where: { userId: ctx.userId } });
    if (input.restrictions.length) {
      await tx.dietaryRestriction.createMany({
        data: input.restrictions.map((r) => ({ userId: ctx.userId, ...r })),
      });
    }
    const counts = Object.fromEntries(
      (["ALLERGY", "INTOLERANCE", "AVOID", "OTHER"] as const).map((k) => [
        k.toLowerCase(),
        input.restrictions.filter((r) => r.kind === k).length,
      ]),
    );
    await recordAudit(
      ctx,
      {
        action: "profile.food_preferences_saved",
        entityType: "UserProfile",
        entityId: ctx.userId,
        metadata: counts,
      },
      tx,
    );
  });
}

export async function saveRoutine(ctx: UserContext, input: RoutineInput) {
  await db.$transaction(async (tx) => {
    await ensureProfile(tx, ctx.userId);
    await tx.userProfile.update({
      where: { userId: ctx.userId },
      data: { ...input, mealTimes: input.mealTimes },
    });
    await recordAudit(
      ctx,
      { action: "profile.routine_saved", entityType: "UserProfile", entityId: ctx.userId },
      tx,
    );
  });
}

export async function saveMotivation(ctx: UserContext, input: MotivationInput) {
  await db.$transaction(async (tx) => {
    await ensureProfile(tx, ctx.userId);
    await tx.userProfile.update({ where: { userId: ctx.userId }, data: input });
    await recordAudit(
      ctx,
      { action: "profile.motivation_saved", entityType: "UserProfile", entityId: ctx.userId },
      tx,
    );
  });
}

export async function completeOnboarding(ctx: UserContext) {
  await db.userProfile.update({
    where: { userId: ctx.userId },
    data: { onboardingCompletedAt: ctx.now },
  });
  await recordAudit(ctx, {
    action: "profile.onboarding_completed",
    entityType: "UserProfile",
    entityId: ctx.userId,
  });
}

async function ensureProfile(tx: Prisma.TransactionClient, userId: string) {
  await tx.userProfile.upsert({ where: { userId }, create: { userId }, update: {} });
}

function dedupe(values: string[]) {
  const seen = new Set<string>();
  return values.filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Whether the user has told us anything about how they eat (diet type or any restriction). */
export async function hasFoodPreferences(userId: string): Promise<boolean> {
  const [profile, restrictions] = await Promise.all([
    db.userProfile.findUnique({ where: { userId }, select: { dietType: true } }),
    db.dietaryRestriction.count({ where: { userId } }),
  ]);
  return Boolean(profile?.dietType) || restrictions > 0;
}
