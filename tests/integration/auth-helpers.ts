import { auth } from "@/server/auth/auth";
import { env } from "@/server/lib/env";

type AuthResponse = { status: number; body: Record<string, unknown> | null; cookie: string | null };

let ipCounter = 0;
/** A fresh client IP per test so rate limits don't leak between tests. */
export function freshIp() {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

/** Calls the real auth HTTP handler (origin checks, cookies and rate limits included). */
export async function authRequest(
  path: string,
  options: { body?: unknown; cookie?: string | null; ip?: string; method?: "GET" | "POST" } = {},
): Promise<AuthResponse> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const headers = new Headers({ origin: env.APP_URL, "x-forwarded-for": options.ip ?? "10.255.0.1" });
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.cookie) headers.set("cookie", options.cookie);

  const res = await auth.handler(
    new Request(`${env.APP_URL}/api/auth${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  );
  const text = await res.text();
  const setCookies = res.headers.getSetCookie();
  const cookie = setCookies.length ? setCookies.map((c) => c.split(";")[0]).join("; ") : null;
  return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null, cookie };
}

export async function signUp(email: string, password = "correct horse battery", ip = freshIp()) {
  const res = await authRequest("/sign-up/email", { body: { name: "Test User", email, password }, ip });
  if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...res, cookie: res.cookie!, userId: (res.body!.user as { id: string }).id };
}

export async function getSessionUserId(cookie: string | null): Promise<string | null> {
  const res = await authRequest("/get-session", { cookie });
  return (res.body?.user as { id: string } | undefined)?.id ?? null;
}
