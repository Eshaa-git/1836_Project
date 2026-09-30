import "server-only";
import type { z } from "zod";
import { err, ok, type ActionResult } from "@/lib/result";
import { optionalUserContext, requireUserContext } from "@/server/auth/session";
import { createContext, type RequestContext } from "./context";
import { isAppError, ValidationError, type FieldErrors } from "./errors";

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
  handler: (input: z.infer<S>, ctx: RequestContext) => Promise<T>,
  options: {
    name: string;
    auth?: "required" | "public";
    /** Override context resolution (tests). */
    context?: () => RequestContext | Promise<RequestContext>;
  },
) {
  const resolveContext =
    options.context ?? (options.auth === "public" ? optionalUserContext : requireUserContext);

  return async (rawInput: unknown): Promise<ActionResult<T>> => {
    let ctx = createContext();
    try {
      ctx = await resolveContext();
      const parsed = schema.safeParse(rawInput);
      if (!parsed.success) throw new ValidationError(undefined, toFieldErrors(parsed.error));
      return ok(await handler(parsed.data, ctx));
    } catch (error) {
      if (isAppError(error)) {
        ctx.logger.info({ action: options.name, code: error.code }, "action rejected");
        return err({
          code: error.code,
          message: error.userMessage,
          ...(error instanceof ValidationError ? { fieldErrors: error.fieldErrors } : {}),
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
