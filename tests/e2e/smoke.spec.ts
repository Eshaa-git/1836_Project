import { expect, test } from "./fixtures";

test("health endpoint reports the database as reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: "ok", database: "ok" });
});

test("landing page offers sign up and sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("kitchen you already have");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test("today shows unknown nutrition as a dash, never zero", async ({ page, user }) => {
  void user;
  await page.goto("/today");
  const calories = page.getByRole("progressbar", { name: "Calories" });
  await expect(calories).toHaveAttribute("aria-valuetext", /— \/ — kcal, no target yet/);
  await expect(page.getByText("0 / ")).toHaveCount(0);
});

test("main navigation reaches every section", async ({ page, isMobile, user }) => {
  void user;
  await page.goto("/today");
  for (const name of ["AI Coach", "Meals", "Workouts"]) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }

  // Secondary sections live in the sidebar on desktop and under "More" on mobile.
  if (isMobile) await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible();
  if (isMobile) {
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } else {
    await expect(page.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page");
  }
});

test("theme can be switched to dark", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("unknown routes show a friendly 404", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
});
