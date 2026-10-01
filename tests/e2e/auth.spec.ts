import { completeSetupInDb, expect, PASSWORD, registerViaApi, test, uniqueEmail } from "./fixtures";

test("signed-out visitors are sent to sign in and returned afterwards", async ({ page }) => {
  const { email } = await registerViaApi(page);
  await completeSetupInDb(email);
  await page.context().clearCookies();

  await page.goto("/workouts");
  await expect(page).toHaveURL(/\/login\?next=%2Fworkouts$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Workouts" })).toBeVisible();
});

test("a new user can register and is taken to setup", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Tell us what to call you.")).toBeVisible();

  await page.getByLabel("Name").fill("Riya");
  await page.getByLabel("Email").fill(uniqueEmail("register"));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding\/basics$/);
  await expect(page.getByLabel("What should we call you?")).toHaveValue("Riya");
});

test("wrong password shows a helpful error", async ({ page }) => {
  const { email } = await registerViaApi(page);
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not my password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();
});

test("signing out ends the session", async ({ page }) => {
  const { email } = await registerViaApi(page);
  await completeSetupInDb(email);
  await page.goto("/today");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);
});

test("forgot password never reveals whether an account exists", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(uniqueEmail("nobody"));
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
});

test("a user can delete their account", async ({ page }) => {
  const { email } = await registerViaApi(page);
  await completeSetupInDb(email);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete account" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Your password").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Permanently delete" }).click();
  await expect(dialog.getByText("Type DELETE to confirm.")).toBeVisible();

  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await dialog.getByRole("button", { name: "Permanently delete" }).click();
  await expect(page).toHaveURL(/\/$/);

  // The account no longer exists.
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();
});
