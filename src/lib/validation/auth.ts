import { z } from "zod";

/** Shared by the auth server config and client forms so both enforce the same rules. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const email = z.email("Enter a valid email address.").trim().toLowerCase();

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you.").max(80, "Keep it under 80 characters."),
  email,
  password,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password."), newPassword: password })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "Choose a password different from your current one.",
    path: ["newPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm."),
  confirmation: z.literal("DELETE", { error: "Type DELETE to confirm." }),
});

/** Only allow same-site relative redirects after sign-in (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/today"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
