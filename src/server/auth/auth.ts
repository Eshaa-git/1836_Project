import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { passwordResetEmail } from "@/server/emails/password-reset";
import { createContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { sendEmail } from "@/server/lib/email";
import { env } from "@/server/lib/env";
import { logger } from "@/server/lib/logger";
import { recordAudit } from "@/server/services/audit";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

const audit = (userId: string, action: string) =>
  recordAudit(createContext({ userId }), { action, entityType: "User", entityId: userId });

/**
 * Authentication: email + password with database sessions.
 *
 * - Passwords are hashed with scrypt by Better Auth; plain passwords are never stored or logged.
 * - Sessions last 30 days and slide daily; resetting a password signs out every other session.
 * - Auth endpoints are rate limited per IP using the database (works across server instances).
 * - Deleting an account hard-deletes the user; every user-owned table cascades (see docs/privacy.md).
 */
export const auth = betterAuth({
  appName: "Nourish",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  advanced: {
    // Let Prisma generate UUIDv7 ids so auth tables follow the schema conventions.
    database: { generateId: false },
    cookiePrefix: "nourish",
  },
  telemetry: { enabled: false },
  logger: {
    log: (level, message, ...args) => logger[level]({ args }, message),
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(passwordResetEmail({ to: user.email, name: user.name, url }));
    },
    onPasswordReset: async ({ user }) => {
      await audit(user.id, "auth.password_reset");
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Sensitive operations (delete account, change password) need a sign-in within the last day.
    freshAge: 60 * 60 * 24,
  },

  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        // Written before the delete so it survives with user_id nulled (pseudonymous record).
        await audit(user.id, "account.deleted");
      },
    },
  },

  rateLimit: {
    enabled: env.AUTH_RATE_LIMIT ? env.AUTH_RATE_LIMIT === "on" : env.NODE_ENV !== "development",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60 * 5, max: 3 },
      "/reset-password": { window: 60 * 5, max: 5 },
      "/delete-user": { window: 60, max: 3 },
    },
  },

  databaseHooks: {
    user: {
      create: { after: async (user) => audit(user.id, "auth.registered") },
    },
    session: {
      create: { after: async (session) => audit(session.userId, "auth.signed_in") },
    },
  },

  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
