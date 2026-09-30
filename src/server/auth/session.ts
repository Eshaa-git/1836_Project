import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createContext, type RequestContext } from "@/server/lib/context";
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
export async function requireUserContext(): Promise<RequestContext & { userId: string }> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  // Phase 2 replaces "UTC" with the timezone saved in the user's profile.
  return createContext({ userId: session.user.id }) as RequestContext & { userId: string };
}

export async function optionalUserContext(): Promise<RequestContext> {
  const session = await getSession();
  return createContext({ userId: session?.user.id ?? null });
}
