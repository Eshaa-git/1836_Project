import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  basicsSchema,
  dailyTargetsSchema,
  foodPreferencesSchema,
  goalSchema,
  measurementSchema,
} from "@/lib/validation/profile";
import { createContext, type UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { SafetyError } from "@/server/lib/errors";
import {
  archiveGoal,
  createGoal,
  evaluateActiveGoal,
  extendGoalTimeline,
  getActiveGoal,
  getGoalHistory,
  markGoalAchieved,
  updateGoal,
} from "@/server/services/goals";
import { addMeasurement, deleteMeasurement, latestMetricValue } from "@/server/services/measurements";
import { getProfileView, saveBasics, saveFoodPreferences } from "@/server/services/profile";
import { getCurrentTargets, getTargetsAt, listTargetHistory, setTargets } from "@/server/services/targets";
import { createTestUser, resetDatabase } from "./helpers";

beforeEach(resetDatabase);
afterAll(() => db.$disconnect());

const NOW = new Date("2026-10-01T15:00:00Z");

async function userCtx(email = "p@example.com", now = NOW): Promise<UserContext> {
  const user = await createTestUser(email);
  return createContext({ userId: user.id, now, timezone: "Asia/Kolkata" }) as UserContext;
}

const at = (ctx: UserContext, now: Date): UserContext => ({ ...ctx, now });

async function withBasics(ctx: UserContext, weightKg: number | "" = 80) {
  await saveBasics(
    ctx,
    basicsSchema.parse({
      name: "Riya",
      birthDate: "1995-04-12",
      sex: "FEMALE",
      heightCm: 165,
      weightKg,
      measurementSystem: "METRIC",
      timezone: "Asia/Kolkata",
    }),
  );
}

describe("profile basics", () => {
  it("saves basics and records the weight as today's measurement", async () => {
    const ctx = await userCtx();
    await withBasics(ctx);
    const view = await getProfileView(ctx.userId, "2026-10-01");
    expect(view).toMatchObject({ name: "Riya", age: 31, heightCm: 165, timezone: "Asia/Kolkata" });
    expect(view.latestWeight).toEqual({ value: 80, localDate: "2026-10-01" });
  });

  it("updates today's weight instead of duplicating it when basics are saved again", async () => {
    const ctx = await userCtx();
    await withBasics(ctx, 80);
    await withBasics(ctx, 79.5);
    expect(await db.bodyMeasurement.count({ where: { userId: ctx.userId } })).toBe(1);
    expect((await latestMetricValue(ctx.userId, "BODY_WEIGHT_KG"))?.value).toBe(79.5);
  });

  it("leaves weight unknown when not provided", async () => {
    const ctx = await userCtx();
    await withBasics(ctx, "");
    expect((await getProfileView(ctx.userId, "2026-10-01")).latestWeight).toBeNull();
  });
});

describe("dietary restrictions", () => {
  it("stores the four categories separately and replaces the list atomically", async () => {
    const ctx = await userCtx();
    await saveFoodPreferences(
      ctx,
      foodPreferencesSchema.parse({
        dietType: "VEGETARIAN",
        cuisines: ["Indian", "indian", "Italian"],
        restrictions: [
          { kind: "ALLERGY", label: "Peanuts", allergenCode: "peanut", severity: "SEVERE" },
          { kind: "INTOLERANCE", label: "Lactose", allergenCode: "milk" },
          { kind: "AVOID", label: "Mushrooms" },
          { kind: "OTHER", label: "No onion or garlic" },
        ],
      }),
    );
    let view = await getProfileView(ctx.userId, "2026-10-01");
    expect(view.cuisines).toEqual(["Indian", "Italian"]);
    expect(view.restrictions.map((r) => `${r.kind}:${r.label}:${r.allergenCode}:${r.severity}`)).toEqual([
      "ALLERGY:Peanuts:peanut:SEVERE",
      "INTOLERANCE:Lactose:milk:null",
      "AVOID:Mushrooms:null:null",
      "OTHER:No onion or garlic:null:null",
    ]);

    await saveFoodPreferences(
      ctx,
      foodPreferencesSchema.parse({ restrictions: [{ kind: "AVOID", label: "Okra" }] }),
    );
    view = await getProfileView(ctx.userId, "2026-10-01");
    expect(view.restrictions.map((r) => r.label)).toEqual(["Okra"]);
  });

  it("never shows one user's restrictions to another", async () => {
    const a = await userCtx("a@example.com");
    const b = await userCtx("b@example.com");
    await saveFoodPreferences(
      a,
      foodPreferencesSchema.parse({ restrictions: [{ kind: "ALLERGY", label: "Sesame" }] }),
    );
    expect((await getProfileView(b.userId, "2026-10-01")).restrictions).toEqual([]);
  });
});

describe("measurements", () => {
  it("rejects future dates and only lets owners delete", async () => {
    const a = await userCtx("a@example.com");
    const b = await userCtx("b@example.com");
    await expect(
      addMeasurement(a, measurementSchema.parse({ localDate: "2026-10-05", weightKg: 70 })),
    ).rejects.toThrow();
    const m = await addMeasurement(a, measurementSchema.parse({ localDate: "2026-09-28", waistCm: 82 }));
    await expect(deleteMeasurement(b, m.id)).rejects.toThrow("not found");
    await deleteMeasurement(a, m.id);
    expect(await db.bodyMeasurement.count()).toBe(0);
  });
});

describe("daily targets", () => {
  const targets = (v: Record<string, unknown>) => dailyTargetsSchema.parse(v);

  it("keeps an append-only history and closes the previous set", async () => {
    const ctx = await userCtx();
    await withBasics(ctx);
    const first = await setTargets(ctx, targets({ caloriesKcal: 1900, proteinG: 110 }));
    const later = at(ctx, new Date("2026-10-15T09:00:00Z"));
    const second = await setTargets(later, targets({ caloriesKcal: 1800, proteinG: 120, waterMl: 2500 }));

    const history = await listTargetHistory(ctx.userId);
    expect(history.map((h) => h.caloriesKcal)).toEqual([1800, 1900]);
    expect(history[1]!.effectiveTo).toBe("2026-10-15T09:00:00.000Z");
    expect((await getCurrentTargets(ctx.userId))?.id).toBe(second.id);
    expect((await getTargetsAt(ctx.userId, new Date("2026-10-10T00:00:00Z")))?.id).toBe(first.id);
    // Fields left blank stay unknown, not zero.
    expect(second.fatG).toBeNull();
  });

  it("does not create a history entry when nothing changed", async () => {
    const ctx = await userCtx();
    await setTargets(ctx, targets({ caloriesKcal: 2000 }));
    await setTargets(
      at(ctx, new Date("2026-10-02T00:00:00Z")),
      targets({ caloriesKcal: 2000, reason: "same" }),
    );
    expect(await db.dailyTarget.count()).toBe(1);
  });

  it("blocks implausible values", async () => {
    const ctx = await userCtx();
    const error = await setTargets(ctx, targets({ caloriesKcal: 600 })).catch((e) => e);
    expect(error).toBeInstanceOf(SafetyError);
    expect((error as SafetyError).issues.map((i) => i.code)).toEqual(["CALORIES_IMPLAUSIBLE"]);
    expect(await db.dailyTarget.count()).toBe(0);
  });

  it("requires acknowledgement of warnings and records it", async () => {
    const ctx = await userCtx();
    await withBasics(ctx);
    await expect(setTargets(ctx, targets({ caloriesKcal: 1100 }))).rejects.toBeInstanceOf(SafetyError);
    const saved = await setTargets(
      ctx,
      targets({ caloriesKcal: 1100, acknowledgedWarnings: ["CALORIES_VERY_LOW"] }),
    );
    expect(saved.acknowledgedWarnings).toEqual(["CALORIES_VERY_LOW"]);
  });
});

describe("goals", () => {
  const goal = (v: Record<string, unknown>) => goalSchema.parse(v);

  it("starts from the latest measurement and evaluates start → current → target", async () => {
    const ctx = await userCtx();
    await withBasics(ctx, 80);
    const created = await createGoal(
      ctx,
      goal({ type: "FAT_LOSS", metric: "BODY_WEIGHT_KG", targetValue: 72, targetDate: "2027-03-01" }),
    );
    expect(created).toMatchObject({
      startValue: 80,
      targetValue: 72,
      startDate: "2026-10-01",
      title: "Lose fat",
    });

    await addMeasurement(ctx, measurementSchema.parse({ localDate: "2026-10-01", weightKg: 76 }));
    const result = await evaluateActiveGoal(ctx);
    expect(result?.evaluation).toEqual({ state: "in_progress", fraction: 0.5, remaining: 4 });
  });

  it("uses the entered start value when there is no measurement", async () => {
    const ctx = await userCtx();
    const created = await createGoal(
      ctx,
      goal({
        type: "FAT_LOSS",
        metric: "WAIST_CM",
        startValue: 90,
        targetValue: 82,
        targetDate: "2027-03-01",
      }),
    );
    expect(created.startValue).toBe(90);
    expect((await evaluateActiveGoal(ctx))?.evaluation).toEqual({ state: "no_data" });
  });

  it("requires acknowledgement for an aggressive plan and suggests a safer date", async () => {
    const ctx = await userCtx();
    await withBasics(ctx, 80);
    const input = {
      type: "WEIGHT_LOSS",
      metric: "BODY_WEIGHT_KG",
      targetValue: 70,
      targetDate: "2026-11-01",
    };
    const error = (await createGoal(ctx, goal(input)).catch((e) => e)) as SafetyError;
    expect(error.issues[0]).toMatchObject({ code: "LOSS_TOO_FAST", suggestion: { field: "targetDate" } });
    const saved = await createGoal(ctx, goal({ ...input, acknowledgedWarnings: ["LOSS_TOO_FAST"] }));
    expect(saved.status).toBe("ACTIVE");
  });

  it("records every edit with before/after values", async () => {
    const ctx = await userCtx();
    await withBasics(ctx, 80);
    const created = await createGoal(
      ctx,
      goal({ type: "FAT_LOSS", metric: "BODY_WEIGHT_KG", targetValue: 72, targetDate: "2027-03-01" }),
    );
    await updateGoal(
      ctx,
      created.id,
      goal({
        type: "FAT_LOSS",
        metric: "BODY_WEIGHT_KG",
        targetValue: 74,
        targetDate: "2027-03-01",
        workoutsPerWeek: 3,
      }),
    );
    const { events } = await getGoalHistory(ctx.userId);
    expect(events[0]).toMatchObject({
      type: "UPDATED",
      changes: { targetValue: { from: 72, to: 74 }, workoutsPerWeek: { from: null, to: 3 } },
    });
  });

  it("keeps replaced goals in history and allows only one active goal", async () => {
    const ctx = await userCtx();
    const first = await createGoal(ctx, goal({ type: "GENERAL_FITNESS" }));
    const second = await createGoal(
      ctx,
      goal({ type: "STRENGTH", metric: "WORKOUTS_PER_WEEK", workoutsPerWeek: 3 }),
    );
    const { goals } = await getGoalHistory(ctx.userId);
    expect(goals.map((g) => [g.id, g.status])).toEqual([
      [second.id, "ACTIVE"],
      [first.id, "REPLACED"],
    ]);
    await expect(db.goal.update({ where: { id: first.id }, data: { status: "ACTIVE" } })).rejects.toThrow(); // partial unique index
  });

  it("celebrates an achieved goal by saving a milestone and closing it", async () => {
    const ctx = await userCtx();
    await withBasics(ctx, 80);
    const g = await createGoal(
      ctx,
      goal({ type: "FAT_LOSS", metric: "BODY_WEIGHT_KG", targetValue: 76, targetDate: "2027-03-01" }),
    );
    await addMeasurement(ctx, measurementSchema.parse({ localDate: "2026-10-01", weightKg: 75.8 }));
    expect((await evaluateActiveGoal(ctx))?.evaluation.state).toBe("achieved");

    const milestone = await markGoalAchieved(ctx, g.id);
    expect(milestone).toMatchObject({ title: "Lose fat", value: 75.8 });
    expect(await getActiveGoal(ctx.userId)).toBeNull();
    const { goals, milestones } = await getGoalHistory(ctx.userId);
    expect(goals[0]!.status).toBe("ACHIEVED");
    expect(milestones).toHaveLength(1);
  });

  it("suggests an extension after a missed deadline and only accepts later dates", async () => {
    const ctx = await userCtx();
    await withBasics(ctx, 80);
    const g = await createGoal(
      ctx,
      goal({ type: "FAT_LOSS", metric: "BODY_WEIGHT_KG", targetValue: 77, targetDate: "2026-11-01" }),
    );
    const late = at(ctx, new Date("2026-11-10T10:00:00Z"));
    const result = await evaluateActiveGoal(late);
    expect(result?.evaluation.state).toBe("deadline_passed");
    if (result?.evaluation.state !== "deadline_passed") return;

    await expect(extendGoalTimeline(late, g.id, "2026-11-12", null)).rejects.toThrow();
    const extended = await extendGoalTimeline(late, g.id, result.evaluation.suggestedTargetDate, null);
    expect(extended.targetDate).toBe(result.evaluation.suggestedTargetDate);
    const { events } = await getGoalHistory(ctx.userId);
    expect(events[0]).toMatchObject({
      type: "TIMELINE_EXTENDED",
      changes: { targetDate: { from: "2026-11-01" } },
    });
  });

  it("does not let one user touch another user's goal", async () => {
    const a = await userCtx("a@example.com");
    const b = await userCtx("b@example.com");
    const g = await createGoal(a, goal({ type: "GENERAL_FITNESS" }));
    await expect(archiveGoal(b, g.id)).rejects.toThrow("not found");
    await expect(markGoalAchieved(b, g.id)).rejects.toThrow("not found");
  });
});

describe("account deletion covers profile data", () => {
  it("cascades every profile, measurement, restriction, goal and target row", async () => {
    const ctx = await userCtx();
    await withBasics(ctx);
    await saveFoodPreferences(
      ctx,
      foodPreferencesSchema.parse({ restrictions: [{ kind: "ALLERGY", label: "Egg" }] }),
    );
    await setTargets(ctx, dailyTargetsSchema.parse({ caloriesKcal: 2000 }));
    const g = await createGoal(ctx, goalSchema.parse({ type: "GENERAL_FITNESS" }));
    await markGoalAchieved(ctx, g.id);

    await db.user.delete({ where: { id: ctx.userId } });

    const counts = await Promise.all([
      db.userProfile.count(),
      db.bodyMeasurement.count(),
      db.dietaryRestriction.count(),
      db.goal.count(),
      db.goalEvent.count(),
      db.goalMilestone.count(),
      db.dailyTarget.count(),
    ]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(await db.auditLog.count({ where: { userId: { not: null } } })).toBe(0);
  });
});
