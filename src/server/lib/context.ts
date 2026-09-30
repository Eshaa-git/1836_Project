import "server-only";
import { randomUUID } from "node:crypto";
import { logger as rootLogger, type Logger } from "./logger";

/**
 * Per-request context passed explicitly into services. Keeping `now` and the
 * user's timezone here (rather than calling Date.now() inside services) makes
 * date-dependent logic deterministic and testable.
 */
export type RequestContext = {
  requestId: string;
  /** Authenticated user id; null for anonymous requests. Set in Phase 1. */
  userId: string | null;
  now: Date;
  /** IANA timezone used for "today" boundaries. */
  timezone: string;
  logger: Logger;
};

export function createContext(overrides: Partial<Omit<RequestContext, "logger">> = {}): RequestContext {
  const requestId = overrides.requestId ?? randomUUID();
  const userId = overrides.userId ?? null;
  return {
    requestId,
    userId,
    now: overrides.now ?? new Date(),
    timezone: overrides.timezone ?? "UTC",
    logger: rootLogger.child({ requestId, userId }),
  };
}
