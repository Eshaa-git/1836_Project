import "server-only";
import type { z } from "zod";
import { err, ok, type ActionResult } from "@/lib/result";
import { optionalUserContext, requireUserContext } from "@/server/auth/session";
import { createContext, type RequestContext, type UserContext } from "./context";
import { isAppError, SafetyError, ValidationError, type FieldErrors } from "./errors";

type ActionOptions<C extends RequestContext> = {
  name: string;
  /** Override context resolution (tests). */
  context?: () => C | Promise<C>;
};

/**
 * Wraps a server-action handler with input validation and error mapping so
 * every action behaves the same way:
 *   - the caller must be signed in unless `auth: "public"` (secure by default)
 *   - input is parsed with the given Zod schema (never trusted as typed)
 *   - AppErrors become a safe `{ ok: false, error }` result
 *   - unexpected errors are logged with the request id and returned generically
 */
export function defineAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>, ctx: UserContext) => Promise<T>,
  options: ActionOptions<UserContext> & { auth?: "required" },
): (rawInput: unknown) => Promise<ActionResult<T>>;
export function defineAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>, ctx: RequestContext) => Promise<T>,
  options: ActionOptions<RequestContext> & { auth: "public" },
): (rawInput: unknown) => Promise<ActionResult<T>>;
export function defineAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>, ctx: never) => Promise<T>,
  options: ActionOptions<RequestContext> & { auth?: "required" | "public" },
) {
  const resolveContext: () => RequestContext | Promise<RequestContext> =
    options.context ?? (options.auth === "public" ? optionalUserContext : requireUserContext);
  const run = handler as (input: z.infer<S>, ctx: RequestContext) => Promise<T>;

  return async (rawInput: unknown): Promise<ActionResult<T>> => {
    let ctx = createContext();
    try {
      ctx = await resolveContext();
      const parsed = schema.safeParse(rawInput);
      if (!parsed.success) throw new ValidationError(undefined, toFieldErrors(parsed.error));
      return ok(await run(parsed.data, ctx));
    } catch (error) {
      if (isAppError(error)) {
        ctx.logger.info({ action: options.name, code: error.code }, "action rejected");
        return err({
          code: error.code,
          message: error.userMessage,
          ...(error instanceof ValidationError ? { fieldErrors: error.fieldErrors } : {}),
          ...(error instanceof SafetyError && error.issues.length ? { safetyIssues: error.issues } : {}),
        });
      }
      ctx.logger.error({ action: options.name, err: error }, "action failed unexpectedly");
      return err({
        code: "INTERNAL",
        message: `Something went wrong on our side. Reference: ${ctx.requestId.slice(0, 8)}`,
      });
    }
  };
}

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
