import "server-only";
import type { DailyTarget } from "@/generated/prisma/client";
import { ageOn, localDateIn, toDateOnly } from "@/server/domain/dates";
import { hasBlocking, unacknowledgedWarnings, type SafetyIssue } from "@/server/domain/safety/types";
import { checkDailyTargets, type DailyTargetsInput } from "@/server/domain/targets/safety";
import type { UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { num } from "@/server/lib/decimal";
import { SafetyError } from "@/server/lib/errors";
import type { DailyTargetsFormInput } from "@/lib/validation/profile";
import { recordAudit } from "./audit";
import { latestMetricValue } from "./measurements";

export type TargetsView = DailyTargetsInput & {
  id: string;
  reason: string | null;
  acknowledgedWarnings: string[];
  effectiveFrom: string;
  effectiveTo: string | null;
};

const TARGET_FIELDS = [
  "caloriesKcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
  "waterMl",
  "sleepHours",
] as const;

function toView(t: DailyTarget): TargetsView {
  return {
    id: t.id,
    caloriesKcal: t.caloriesKcal,
    proteinG: num(t.proteinG),
    carbsG: num(t.carbsG),
    fatG: num(t.fatG),
    fiberG: num(t.fiberG),
    waterMl: t.waterMl,
    sleepHours: num(t.sleepHours),
    reason: t.reason,
    acknowledgedWarnings: t.acknowledgedWarnings,
    effectiveFrom: t.effectiveFrom.toISOString(),
    effectiveTo: t.effectiveTo?.toISOString() ?? null,
  };
}

export async function getCurrentTargets(userId: string): Promise<TargetsView | null> {
  const row = await db.dailyTarget.findFirst({ where: { userId, effectiveTo: null } });
  return row ? toView(row) : null;
}

/** Targets that applied at a given instant (for history-aware summaries). */
export async function getTargetsAt(userId: string, at: Date): Promise<TargetsView | null> {
  const row = await db.dailyTarget.findFirst({
    where: { userId, effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] },
    orderBy: { effectiveFrom: "desc" },
  });
  return row ? toView(row) : null;
}

export async function listTargetHistory(userId: string): Promise<TargetsView[]> {
  const rows = await db.dailyTarget.findMany({ where: { userId }, orderBy: { effectiveFrom: "desc" } });
  return rows.map(toView);
}

export async function checkTargetsForUser(
  ctx: UserContext,
  input: DailyTargetsInput,
): Promise<SafetyIssue[]> {
  const [profile, weight] = await Promise.all([
    db.userProfile.findUnique({ where: { userId: ctx.userId }, select: { sex: true, birthDate: true } }),
    latestMetricValue(ctx.userId, "BODY_WEIGHT_KG"),
  ]);
  const today = localDateIn(ctx.timezone, ctx.now);
  return checkDailyTargets(input, {
    sex: profile?.sex ?? null,
    age: profile?.birthDate ? ageOn(toDateOnly(profile.birthDate), today) : null,
    weightKg: weight?.value ?? null,
  });
}

/**
 * Sets new daily targets. History is append-only: the current row is closed
 * (effective_to = now) and a new row starts now. Blocking issues are refused;
 * warnings must be acknowledged by code.
 */
export async function setTargets(ctx: UserContext, input: DailyTargetsFormInput): Promise<TargetsView> {
  const values = Object.fromEntries(TARGET_FIELDS.map((f) => [f, input[f]])) as DailyTargetsInput;
  const issues = await checkTargetsForUser(ctx, values);
  if (hasBlocking(issues)) {
    throw new SafetyError("Some targets are outside a safe or realistic range.", issues);
  }
  const pending = unacknowledgedWarnings(issues, input.acknowledgedWarnings);
  if (pending.length) {
    throw new SafetyError("Please review these before saving.", issues);
  }
  const acknowledged = issues.filter((i) => i.severity === "warn").map((i) => i.code);

  return db.$transaction(async (tx) => {
    const current = await tx.dailyTarget.findFirst({ where: { userId: ctx.userId, effectiveTo: null } });
    if (current && TARGET_FIELDS.every((f) => num(current[f]) === values[f])) {
      return toView(current); // Nothing changed — don't create a history entry.
    }
    if (current) {
      await tx.dailyTarget.update({ where: { id: current.id }, data: { effectiveTo: ctx.now } });
    }
    const created = await tx.dailyTarget.create({
      data: {
        userId: ctx.userId,
        ...values,
        reason: input.reason,
        acknowledgedWarnings: acknowledged,
        effectiveFrom: ctx.now,
      },
    });
    await recordAudit(
      ctx,
      {
        action: "targets.set",
        entityType: "DailyTarget",
        entityId: created.id,
        metadata: { previousId: current?.id ?? null, acknowledgedWarnings: acknowledged },
      },
      tx,
    );
    return toView(created);
  });
}
