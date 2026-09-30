import { db } from "@/server/lib/db";
import { logger } from "@/server/lib/logger";

export const dynamic = "force-dynamic";

/** Liveness + database readiness probe for deploys, CI and e2e tests. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok" });
  } catch (error) {
    logger.error({ err: error }, "health check: database unreachable");
    return Response.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
