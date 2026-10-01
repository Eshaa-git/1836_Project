import "server-only";
import type { Goal, GoalEvent, GoalMilestone, Prisma } from "@/generated/prisma/client";
import {
  ageOn,
  daysBetween,
  fromDateOnly,
  localDateIn,
  toDateOnly,
  type DateOnly,
} from "@/server/domain/dates";
import {
  checkGoalPlan,
  evaluateGoal,
  METRICS_FOR_GOAL,
  type GoalEvaluation,
  type GoalPlan,
} from "@/server/domain/goals/goals";
import { hasBlocking, unacknowledgedWarnings } from "@/server/domain/safety/types";
import type { UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { num } from "@/server/lib/decimal";
import { ConflictError, NotFoundError, SafetyError, ValidationError } from "@/server/lib/errors";
import type { GoalInput } from "@/lib/validation/profile";
import { recordAudit } from "./audit";
import { latestMetricValue } from "./measurements";

type Tx = Prisma.TransactionClient;

export type GoalView = {
  id: string;
  type: Goal["type"];
  status: Goal["status"];
  title: string;
  metric: Goal["metric"];
  startValue: number | null;
  targetValue: number | null;
  startDate: DateOnly;
  targetDate: DateOnly | null;
  workoutsPerWeek: number | null;
  achievedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

export type GoalEventView = {
  id: string;
  goalId: string;
  type: GoalEvent["type"];
  changes: Record<string, { from: unknown; to: unknown }> | null;
  note: string | null;
  createdAt: string;
};

export type MilestoneView = { id: string; title: string; value: number | null; achievedAt: string };

export const GOAL_TITLES: Record<Goal["type"], string> = {
  FAT_LOSS: "Lose fat",
  WEIGHT_LOSS: "Lose weight",
  MAINTENANCE: "Maintain my weight",
  MUSCLE_GAIN: "Build muscle",
  STRENGTH: "Get stronger",
  GENERAL_FITNESS: "Improve my fitness",
};

function toView(g: Goal): GoalView {
  return {
    id: g.id,
    type: g.type,
    status: g.status,
    title: g.title,
    metric: g.metric,
    startValue: num(g.startValue),
    targetValue: num(g.targetValue),
    startDate: toDateOnly(g.startDate),
    targetDate: g.targetDate ? toDateOnly(g.targetDate) : null,
    workoutsPerWeek: g.workoutsPerWeek,
    achievedAt: g.achievedAt?.toISOString() ?? null,
    closedAt: g.closedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
  };
}

const toPlan = (g: GoalView): GoalPlan => ({
  type: g.type,
  metric: g.metric,
  startValue: g.startValue,
  targetValue: g.targetValue,
  startDate: g.startDate,
  targetDate: g.targetDate,
});

export async function getActiveGoal(userId: string): Promise<GoalView | null> {
  const goal = await db.goal.findFirst({ where: { userId, status: "ACTIVE" } });
  return goal ? toView(goal) : null;
}

export async function getGoalHistory(userId: string) {
  const [goals, events, milestones] = await Promise.all([
    db.goal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.goalEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.goalMilestone.findMany({ where: { userId }, orderBy: { achievedAt: "desc" } }),
  ]);
  return {
    goals: goals.map(toView),
    events: events.map((e): GoalEventView => ({
      id: e.id,
      goalId: e.goalId,
      type: e.type,
      changes: (e.changes as GoalEventView["changes"]) ?? null,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
    milestones: milestones.map((m: GoalMilestone): MilestoneView => ({
      id: m.id,
      title: m.title,
      value: num(m.value),
      achievedAt: m.achievedAt.toISOString(),
    })),
  };
}

/** Active goal plus where it stands (start → current → target) using the latest measurement. */
export async function evaluateActiveGoal(ctx: UserContext): Promise<{
  goal: GoalView;
  current: { value: number; localDate: DateOnly } | null;
  evaluation: GoalEvaluation;
} | null> {
  const goal = await getActiveGoal(ctx.userId);
  if (!goal) return null;
  const current = await latestMetricValue(ctx.userId, goal.metric);
  const today = localDateIn(ctx.timezone, ctx.now);
  return { goal, current, evaluation: evaluateGoal(toPlan(goal), current?.value ?? null, today) };
}

async function safetyContext(tx: Tx, ctx: UserContext) {
  const profile = await tx.userProfile.findUnique({
    where: { userId: ctx.userId },
    select: { heightCm: true, birthDate: true },
  });
  const today = localDateIn(ctx.timezone, ctx.now);
  return {
    heightCm: num(profile?.heightCm),
    age: profile?.birthDate ? ageOn(toDateOnly(profile.birthDate), today) : null,
  };
}

function enforceSafety(
  plan: GoalPlan,
  ctx: { heightCm: number | null; age: number | null },
  acknowledged: string[],
) {
  const issues = checkGoalPlan(plan, ctx);
  if (hasBlocking(issues)) throw new SafetyError("Let's adjust this goal first.", issues);
  if (unacknowledgedWarnings(issues, acknowledged).length) {
    throw new SafetyError("Please review these before saving.", issues);
  }
  return issues.filter((i) => i.severity === "warn").map((i) => i.code);
}

function validateMetric(input: GoalInput) {
  if (!METRICS_FOR_GOAL[input.type].includes(input.metric)) {
    throw new ValidationError(undefined, { metric: ["That measure doesn't fit this goal."] });
  }
  if (input.metric === "WORKOUTS_PER_WEEK" && input.workoutsPerWeek === null) {
    throw new ValidationError(undefined, { workoutsPerWeek: ["How many workouts a week?"] });
  }
}

/**
 * Creates a new active goal. Any existing active goal is kept in history with
 * status REPLACED. The start value comes from the latest measurement when
 * available, otherwise from the input.
 */
export async function createGoal(ctx: UserContext, input: GoalInput): Promise<GoalView> {
  validateMetric(input);
  const today = localDateIn(ctx.timezone, ctx.now);

  return db.$transaction(async (tx) => {
    const measured = await latestMetricValue(ctx.userId, input.metric, tx);
    const startValue = measured?.value ?? input.startValue;
    const numeric = input.metric !== "NONE" && input.metric !== "WORKOUTS_PER_WEEK";
    const plan: GoalPlan = {
      type: input.type,
      metric: input.metric,
      startValue: numeric ? startValue : null,
      targetValue: numeric ? input.targetValue : null,
      startDate: today,
      targetDate: input.targetDate,
    };
    const acknowledged = enforceSafety(plan, await safetyContext(tx, ctx), input.acknowledgedWarnings);

    const previous = await tx.goal.findFirst({ where: { userId: ctx.userId, status: "ACTIVE" } });
    if (previous) {
      await tx.goal.update({ where: { id: previous.id }, data: { status: "REPLACED", closedAt: ctx.now } });
      await tx.goalEvent.create({
        data: { goalId: previous.id, userId: ctx.userId, type: "REPLACED", note: "Replaced by a new goal" },
      });
    }

    const goal = await tx.goal.create({
      data: {
        userId: ctx.userId,
        type: input.type,
        title: input.title ?? GOAL_TITLES[input.type],
        metric: input.metric,
        startValue: plan.startValue,
        targetValue: plan.targetValue,
        startDate: fromDateOnly(today),
        targetDate: input.targetDate ? fromDateOnly(input.targetDate) : null,
        workoutsPerWeek: input.workoutsPerWeek,
        safetyAcknowledgedAt: acknowledged.length ? ctx.now : null,
      },
    });
    await tx.goalEvent.create({
      data: {
        goalId: goal.id,
        userId: ctx.userId,
        type: "CREATED",
        note: acknowledged.length ? `Saved after reviewing: ${acknowledged.join(", ")}` : null,
      },
    });
    await recordAudit(ctx, { action: "goal.created", entityType: "Goal", entityId: goal.id }, tx);
    return toView(goal);
  });
}

async function findOwnGoal(tx: Tx, ctx: UserContext, goalId: string) {
  const goal = await tx.goal.findFirst({ where: { id: goalId, userId: ctx.userId } });
  if (!goal) throw new NotFoundError("Goal");
  return goal;
}

/** Edits the active goal in place and records exactly what changed. */
export async function updateGoal(ctx: UserContext, goalId: string, input: GoalInput): Promise<GoalView> {
  validateMetric(input);
  return db.$transaction(async (tx) => {
    const existing = await findOwnGoal(tx, ctx, goalId);
    if (existing.status !== "ACTIVE") throw new ConflictError("Only your current goal can be edited.");
    const before = toView(existing);

    const numeric = input.metric !== "NONE" && input.metric !== "WORKOUTS_PER_WEEK";
    let startValue = before.startValue;
    if (input.metric !== before.metric) {
      const measured = await latestMetricValue(ctx.userId, input.metric, tx);
      startValue = numeric ? (measured?.value ?? input.startValue) : null;
    }
    const after = {
      type: input.type,
      metric: input.metric,
      title:
        input.title ?? (before.title === GOAL_TITLES[before.type] ? GOAL_TITLES[input.type] : before.title),
      startValue: numeric ? startValue : null,
      targetValue: numeric ? input.targetValue : null,
      targetDate: input.targetDate,
      workoutsPerWeek: input.workoutsPerWeek,
    };
    const acknowledged = enforceSafety(
      { ...after, startDate: before.startDate },
      await safetyContext(tx, ctx),
      input.acknowledgedWarnings,
    );

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(after) as (keyof typeof after)[]) {
      if (before[key] !== after[key]) changes[key] = { from: before[key], to: after[key] };
    }
    if (!Object.keys(changes).length) return before;

    const updated = await tx.goal.update({
      where: { id: goalId },
      data: {
        ...after,
        targetDate: after.targetDate ? fromDateOnly(after.targetDate) : null,
        safetyAcknowledgedAt: acknowledged.length ? ctx.now : existing.safetyAcknowledgedAt,
      },
    });
    await tx.goalEvent.create({
      data: { goalId, userId: ctx.userId, type: "UPDATED", changes: changes as Prisma.InputJsonValue },
    });
    await recordAudit(ctx, { action: "goal.updated", entityType: "Goal", entityId: goalId }, tx);
    return toView(updated);
  });
}

/**
 * Accepts a timeline extension (usually the system's suggestion after a missed
 * deadline). Only moves the date later — never shortens it.
 */
export async function extendGoalTimeline(
  ctx: UserContext,
  goalId: string,
  targetDate: DateOnly,
  note: string | null,
): Promise<GoalView> {
  return db.$transaction(async (tx) => {
    const goal = await findOwnGoal(tx, ctx, goalId);
    if (goal.status !== "ACTIVE") throw new ConflictError("Only your current goal can be extended.");
    const today = localDateIn(ctx.timezone, ctx.now);
    const current = goal.targetDate ? toDateOnly(goal.targetDate) : null;
    if (daysBetween(today, targetDate) < 7 || (current && daysBetween(current, targetDate) <= 0)) {
      throw new ValidationError(undefined, {
        targetDate: ["Choose a later date, at least a week from today."],
      });
    }
    const updated = await tx.goal.update({
      where: { id: goalId },
      data: { targetDate: fromDateOnly(targetDate) },
    });
    await tx.goalEvent.create({
      data: {
        goalId,
        userId: ctx.userId,
        type: "TIMELINE_EXTENDED",
        changes: { targetDate: { from: current, to: targetDate } },
        note,
      },
    });
    await recordAudit(ctx, { action: "goal.timeline_extended", entityType: "Goal", entityId: goalId }, tx);
    return toView(updated);
  });
}

/**
 * Marks the active goal achieved and saves it as a milestone. The goal stays in
 * history; the user is then asked for their next target (UI).
 */
export async function markGoalAchieved(ctx: UserContext, goalId: string): Promise<MilestoneView> {
  return db.$transaction(async (tx) => {
    const goal = await findOwnGoal(tx, ctx, goalId);
    if (goal.status !== "ACTIVE") throw new ConflictError("This goal is already closed.");
    const current = await latestMetricValue(ctx.userId, goal.metric, tx);
    await tx.goal.update({
      where: { id: goalId },
      data: { status: "ACHIEVED", achievedAt: ctx.now, closedAt: ctx.now },
    });
    await tx.goalEvent.create({ data: { goalId, userId: ctx.userId, type: "ACHIEVED" } });
    const milestone = await tx.goalMilestone.create({
      data: {
        userId: ctx.userId,
        goalId,
        title: goal.title,
        value: current?.value ?? num(goal.targetValue),
        achievedAt: ctx.now,
      },
    });
    await recordAudit(ctx, { action: "goal.achieved", entityType: "Goal", entityId: goalId }, tx);
    return {
      id: milestone.id,
      title: milestone.title,
      value: num(milestone.value),
      achievedAt: milestone.achievedAt.toISOString(),
    };
  });
}

export async function archiveGoal(ctx: UserContext, goalId: string) {
  await db.$transaction(async (tx) => {
    const goal = await findOwnGoal(tx, ctx, goalId);
    if (goal.status !== "ACTIVE") throw new ConflictError("This goal is already closed.");
    await tx.goal.update({ where: { id: goalId }, data: { status: "ARCHIVED", closedAt: ctx.now } });
    await tx.goalEvent.create({ data: { goalId, userId: ctx.userId, type: "ARCHIVED" } });
    await recordAudit(ctx, { action: "goal.archived", entityType: "Goal", entityId: goalId }, tx);
  });
}
