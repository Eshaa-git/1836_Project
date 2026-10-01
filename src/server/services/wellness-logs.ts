import "server-only";
import {
  fromDateOnly,
  localDateIn,
  sleepDurationMin,
  toDateOnly,
  zonedTimeToUtc,
  addDays,
  type DateOnly,
} from "@/server/domain/dates";
import type { UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import { recordAudit } from "./audit";

function assertNotFuture(ctx: UserContext, localDate: DateOnly) {
  if (localDate > localDateIn(ctx.timezone, ctx.now)) {
    throw new ValidationError(undefined, { localDate: ["You can only log today or earlier."] });
  }
}

// ─── Hydration ───────────────────────────────────────────────────────────────

export type HydrationDay = {
  /** Null when nothing was logged — unknown, not zero. */
  totalMl: number | null;
  entries: { id: string; amountMl: number; drink: string; loggedAt: string }[];
};

export async function addWater(
  ctx: UserContext,
  input: { localDate: DateOnly; amountMl: number; drink: string },
) {
  assertNotFuture(ctx, input.localDate);
  const isToday = input.localDate === localDateIn(ctx.timezone, ctx.now);
  const row = await db.hydrationLog.create({
    data: {
      userId: ctx.userId,
      localDate: fromDateOnly(input.localDate),
      loggedAt: isToday ? ctx.now : zonedTimeToUtc(input.localDate, "12:00", ctx.timezone),
      amountMl: input.amountMl,
      drink: input.drink,
    },
  });
  await recordAudit(ctx, { action: "hydration.added", entityType: "HydrationLog", entityId: row.id });
  return row.id;
}

export async function deleteWater(ctx: UserContext, id: string) {
  const { count } = await db.hydrationLog.deleteMany({ where: { id, userId: ctx.userId } });
  if (!count) throw new NotFoundError("Water entry");
}

export async function getHydrationDay(userId: string, localDate: DateOnly): Promise<HydrationDay> {
  const rows = await db.hydrationLog.findMany({
    where: { userId, localDate: fromDateOnly(localDate) },
    orderBy: { loggedAt: "asc" },
  });
  return {
    totalMl: rows.length ? rows.reduce((sum, r) => sum + r.amountMl, 0) : null,
    entries: rows.map((r) => ({
      id: r.id,
      amountMl: r.amountMl,
      drink: r.drink,
      loggedAt: r.loggedAt.toISOString(),
    })),
  };
}

// ─── Sleep ───────────────────────────────────────────────────────────────────

export type SleepView = {
  localDate: DateOnly;
  durationMin: number;
  bedtimeAt: string | null;
  wokeAt: string | null;
  quality: number | null;
};

/**
 * Records the main sleep that ended on `localDate`. A bedtime later than the
 * wake time is taken as the previous evening. One entry per morning.
 */
export async function saveSleep(
  ctx: UserContext,
  input: { localDate: DateOnly; bedtime: string; wakeTime: string; quality: number | null },
): Promise<SleepView> {
  assertNotFuture(ctx, input.localDate);
  const durationMin = sleepDurationMin(input.bedtime, input.wakeTime);
  if (durationMin > 16 * 60) {
    throw new ValidationError(undefined, { wakeTime: ["That's over 16 hours — please check the times."] });
  }
  const wokeAt = zonedTimeToUtc(input.localDate, input.wakeTime, ctx.timezone);
  const bedDate = input.bedtime > input.wakeTime ? addDays(input.localDate, -1) : input.localDate;
  const bedtimeAt = zonedTimeToUtc(bedDate, input.bedtime, ctx.timezone);
  if (wokeAt > ctx.now) {
    throw new ValidationError(undefined, { wakeTime: ["That wake-up time hasn't happened yet."] });
  }

  const key = { userId: ctx.userId, localDate: fromDateOnly(input.localDate) };
  const data = { bedtimeAt, wokeAt, durationMin, quality: input.quality };
  const row = await db.sleepLog.upsert({
    where: { userId_localDate: key },
    create: { ...key, ...data },
    update: data,
  });
  await recordAudit(ctx, { action: "sleep.saved", entityType: "SleepLog", entityId: row.id });
  return toSleepView(row);
}

function toSleepView(row: {
  localDate: Date;
  durationMin: number;
  bedtimeAt: Date | null;
  wokeAt: Date | null;
  quality: number | null;
}): SleepView {
  return {
    localDate: toDateOnly(row.localDate),
    durationMin: row.durationMin,
    bedtimeAt: row.bedtimeAt?.toISOString() ?? null,
    wokeAt: row.wokeAt?.toISOString() ?? null,
    quality: row.quality,
  };
}

/** Sleep for a morning, or null when none was logged (unknown, not zero). */
export async function getSleep(userId: string, localDate: DateOnly): Promise<SleepView | null> {
  const row = await db.sleepLog.findUnique({
    where: { userId_localDate: { userId, localDate: fromDateOnly(localDate) } },
  });
  return row ? toSleepView(row) : null;
}

export async function deleteSleep(ctx: UserContext, localDate: DateOnly) {
  await db.sleepLog.deleteMany({ where: { userId: ctx.userId, localDate: fromDateOnly(localDate) } });
}
