import type { SafetyIssue } from "@/server/domain/safety/types";

/**
 * Typed application errors. Services throw these; the action/route layer maps
 * them to safe user-facing responses. Anything that is not an AppError is
 * treated as an unexpected 500 and its message is never shown to users.
 */
export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SAFETY"
  | "RATE_LIMITED"
  | "INTERNAL";

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Safe to display to the end user. */
  readonly userMessage: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    status: number,
    userMessage: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(userMessage, { cause: options?.cause });
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
    this.details = options?.details;
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: FieldErrors;
  constructor(message = "Please check the highlighted fields.", fieldErrors: FieldErrors = {}) {
    super("VALIDATION", 400, message);
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this.") {
    super("FORBIDDEN", 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Item") {
    super("NOT_FOUND", 404, `${entity} not found.`);
  }
}

export class ConflictError extends AppError {
  constructor(message = "This changed since you last loaded it. Please refresh and try again.") {
    super("CONFLICT", 409, message);
  }
}

/**
 * A request that would violate a safety rule (e.g. scheduling a recipe that
 * contains a recorded allergen). Never downgraded to a warning silently.
 */
export class SafetyError extends AppError {
  readonly issues: SafetyIssue[];
  constructor(message: string, issues: SafetyIssue[] = []) {
    super("SAFETY", 422, message);
    this.issues = issues;
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Please wait a moment and try again.") {
    super("RATE_LIMITED", 429, message);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
