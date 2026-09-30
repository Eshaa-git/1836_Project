import { test as base, expect, type Page } from "@playwright/test";

export const PASSWORD = "correct horse battery";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Registers a fresh user through the auth API; the session cookie lands in the page's context. */
export async function registerViaApi(page: Page, email = uniqueEmail(), name = "Sam Tester") {
  const baseURL = test.info().project.use.baseURL!;
  const res = await page.request.post("/api/auth/sign-up/email", {
    data: { name, email, password: PASSWORD },
    headers: { origin: baseURL },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return { email, name };
}

/** `page` that starts signed in as a brand-new user. */
export const test = base.extend<{ user: { email: string; name: string } }>({
  user: async ({ page }, provide) => {
    await provide(await registerViaApi(page));
  },
});

export { expect };
