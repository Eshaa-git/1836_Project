import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { RequestContext } from "@/server/lib/context";
import { db as rootDb, type Db } from "@/server/lib/db";
import { insertAuditLog } from "@/server/repositories/audit-log";

type RecordAuditInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  actorType?: "USER" | "SYSTEM" | "AI";
};

/**
 * Records an audit event for the current request. Pass the transaction client
 * as `db` when the audited change happens inside a transaction.
 * Metadata must not contain personal data (names, emails, measurements).
 */
export async function recordAudit(
  ctx: RequestContext,
  input: RecordAuditInput,
  db: Pick<Db, "auditLog"> = rootDb,
) {
  await insertAuditLog(db, {
    userId: ctx.userId,
    actorType: input.actorType ?? (ctx.userId ? "USER" : "SYSTEM"),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    requestId: ctx.requestId,
  });
}
