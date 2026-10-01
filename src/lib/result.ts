/**
 * Explicit success/failure values for domain functions whose failure is an
 * expected outcome (not an exception). Shared by client and server code.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Serializable shape returned from server actions to the client. */
export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  /** Present on SAFETY errors: the issues the user must see (and possibly acknowledge). */
  safetyIssues?: {
    code: string;
    severity: "block" | "warn" | "info";
    field?: string;
    message: string;
    suggestion?: { field: string; value: string | number; label: string };
  }[];
};

export type ActionResult<T> = Result<T, ActionError>;
