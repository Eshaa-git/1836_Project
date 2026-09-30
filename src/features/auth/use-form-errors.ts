"use client";

import { useState } from "react";
import type { z } from "zod";

type FieldErrors = Record<string, string[]>;

/**
 * Minimal client-side form state: validates FormData against a Zod schema and
 * tracks field errors plus a form-level error (e.g. "wrong password").
 */
export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function validate<S extends z.ZodType>(schema: S, form: HTMLFormElement): z.infer<S> | null {
    setFormError(null);
    const result = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (result.success) {
      setFieldErrors({});
      return result.data;
    }
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_form";
      (errors[key] ??= []).push(issue.message);
    }
    setFieldErrors(errors);
    return null;
  }

  return { fieldErrors, formError, setFormError, validate };
}

/** Maps Better Auth error codes to friendly copy; never reveals whether an email exists on sign-in. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string }): string {
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match. Try again or reset your password.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Try signing in instead.";
    case "INVALID_TOKEN":
      return "This reset link is invalid or has expired. Request a new one.";
    case "INVALID_PASSWORD":
      return "That password isn't right.";
    case "SESSION_EXPIRED":
      return "For your security, please sign in again before doing this.";
    case "PASSWORD_TOO_SHORT":
      return "That password is too short.";
    default:
      return "Something went wrong. Please try again.";
  }
}
