import { test as base, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/nourish_test";

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

/**
 * Test setup shortcut: gives a user a minimal finished profile directly in the
 * test database so tests that aren't about onboarding can start on Today.
 */
export async function completeSetupInDb(email: string) {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO user_profiles (user_id, birth_date, height_cm, timezone, onboarding_completed_at, updated_at)
       SELECT id, '1995-04-12', 168, 'UTC', now(), now() FROM users WHERE email = $1
       ON CONFLICT (user_id) DO UPDATE SET onboarding_completed_at = now()`,
      [email],
    );
  } finally {
    await client.end();
  }
}

/** `page` that starts signed in as a brand-new user who has finished setup. */
export const test = base.extend<{ user: { email: string; name: string } }>({
  user: async ({ page }, provide) => {
    const user = await registerViaApi(page);
    await completeSetupInDb(user.email);
    await provide(user);
  },
});

export { expect };
