import "server-only";
import type { AuditActorType, Prisma } from "@/generated/prisma/client";
import type { Db } from "@/server/lib/db";

export type AuditEntry = {
  userId: string | null;
  actorType: AuditActorType;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  requestId?: string;
};

/** Accepts the root client or a transaction client so audit rows commit atomically with the change. */
type DbLike = Pick<Db, "auditLog">;

export function insertAuditLog(db: DbLike, entry: AuditEntry) {
  return db.auditLog.create({ data: entry });
}

export function listAuditLogsForUser(db: DbLike, userId: string, limit = 50) {
  return db.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
