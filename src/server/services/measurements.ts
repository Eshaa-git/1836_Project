import "server-only";
import type { BodyMeasurement, Prisma } from "@/generated/prisma/client";
import { fromDateOnly, localDateIn, toDateOnly, type DateOnly } from "@/server/domain/dates";
import type { GoalMetric } from "@/server/domain/goals/goals";
import type { UserContext } from "@/server/lib/context";
import { db as rootDb } from "@/server/lib/db";
import { num } from "@/server/lib/decimal";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type { MeasurementInput } from "@/lib/validation/profile";
import { recordAudit } from "./audit";

type Tx = Prisma.TransactionClient;

export type MeasurementView = {
  id: string;
  localDate: DateOnly;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string | null;
};

export function toMeasurementView(m: BodyMeasurement): MeasurementView {
  return {
    id: m.id,
    localDate: toDateOnly(m.localDate),
    weightKg: num(m.weightKg),
    bodyFatPct: num(m.bodyFatPct),
    waistCm: num(m.waistCm),
    hipCm: num(m.hipCm),
    chestCm: num(m.chestCm),
    armCm: num(m.armCm),
    thighCm: num(m.thighCm),
    note: m.note,
  };
}

export async function addMeasurement(
  ctx: UserContext,
  input: MeasurementInput,
  db: Tx | typeof rootDb = rootDb,
) {
  const today = localDateIn(ctx.timezone, ctx.now);
  if (input.localDate > today)
    throw new ValidationError(undefined, { localDate: ["The date can't be in the future."] });

  const created = await db.bodyMeasurement.create({
    data: {
      userId: ctx.userId,
      localDate: fromDateOnly(input.localDate),
      // Entries for today keep the exact time; back-dated entries are placed at noon UTC of that date.
      measuredAt: input.localDate === today ? ctx.now : new Date(`${input.localDate}T12:00:00Z`),
      weightKg: input.weightKg,
      bodyFatPct: input.bodyFatPct,
      waistCm: input.waistCm,
      hipCm: input.hipCm,
      chestCm: input.chestCm,
      armCm: input.armCm,
      thighCm: input.thighCm,
      note: input.note,
    },
  });
  await recordAudit(
    ctx,
    { action: "measurement.added", entityType: "BodyMeasurement", entityId: created.id },
    db,
  );
  return toMeasurementView(created);
}

export async function deleteMeasurement(ctx: UserContext, id: string) {
  const { count } = await rootDb.bodyMeasurement.deleteMany({ where: { id, userId: ctx.userId } });
  if (count === 0) throw new NotFoundError("Measurement");
  await recordAudit(ctx, { action: "measurement.deleted", entityType: "BodyMeasurement", entityId: id });
}

export async function listMeasurements(userId: string, limit = 60): Promise<MeasurementView[]> {
  const rows = await rootDb.bodyMeasurement.findMany({
    where: { userId },
    orderBy: [{ localDate: "desc" }, { measuredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toMeasurementView);
}

const METRIC_COLUMN = {
  BODY_WEIGHT_KG: "weightKg",
  BODY_FAT_PCT: "bodyFatPct",
  WAIST_CM: "waistCm",
} as const;

/** Most recent recorded value for a goal metric, or null when there is none (never assumed). */
export async function latestMetricValue(
  userId: string,
  metric: GoalMetric,
  db: Tx | typeof rootDb = rootDb,
): Promise<{ value: number; localDate: DateOnly } | null> {
  if (!(metric in METRIC_COLUMN)) return null;
  const column = METRIC_COLUMN[metric as keyof typeof METRIC_COLUMN];
  const row = await db.bodyMeasurement.findFirst({
    where: { userId, [column]: { not: null } },
    orderBy: [{ localDate: "desc" }, { measuredAt: "desc" }, { createdAt: "desc" }],
  });
  if (!row) return null;
  return { value: num(row[column])!, localDate: toDateOnly(row.localDate) };
}
