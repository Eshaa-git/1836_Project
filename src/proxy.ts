import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for signed-out visitors: only checks that a session
 * cookie exists. The real check happens in the (app) layout and in every
 * server action, which validate the session against the database.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request, { cookiePrefix: "nourish" })) return NextResponse.next();

  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/today") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/today/:path*",
    "/coach/:path*",
    "/meals/:path*",
    "/workouts/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
