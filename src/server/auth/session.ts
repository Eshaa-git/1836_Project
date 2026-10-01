import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createContext, type RequestContext, type UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { UnauthorizedError } from "@/server/lib/errors";
import { auth, type AuthSession } from "./auth";

/** The current session, or null. Deduplicated per request. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return auth.api.getSession({ headers: await headers() });
});

/** For server components/layouts: the session, or a redirect to /login. */
export async function requireSessionOrRedirect(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For actions and route handlers: request context for the signed-in user, or UnauthorizedError. */
export async function requireUserContext(): Promise<UserContext> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  const timezone = await getUserTimezone(session.user.id);
  return createContext({ userId: session.user.id, timezone }) as UserContext;
}

/** The user's saved IANA timezone ("UTC" until the profile is set up). Deduplicated per request. */
export const getUserTimezone = cache(async (userId: string): Promise<string> => {
  const profile = await db.userProfile.findUnique({ where: { userId }, select: { timezone: true } });
  return profile?.timezone ?? "UTC";
});

export async function optionalUserContext(): Promise<RequestContext> {
  const session = await getSession();
  return createContext({ userId: session?.user.id ?? null });
}
