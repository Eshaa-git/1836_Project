import { expect, test } from "@playwright/test";

test("health endpoint reports the database as reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: "ok", database: "ok" });
});

test("landing page leads into the app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("kitchen you already have");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/today$/);
});

test("today shows unknown nutrition as a dash, never zero", async ({ page }) => {
  await page.goto("/today");
  const calories = page.getByRole("progressbar", { name: "Calories" });
  await expect(calories).toHaveAttribute("aria-valuetext", /— \/ — kcal, no target yet/);
  await expect(page.getByText("0 / ")).toHaveCount(0);
});

test("main navigation reaches every section", async ({ page, isMobile }) => {
  await page.goto("/today");
  const sections = ["Meals", "Pantry", "Workouts"];
  for (const name of sections) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }

  // Secondary sections live in the sidebar on desktop and under "More" on mobile.
  if (isMobile) await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("link", { name: "Recipes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Recipes" })).toBeVisible();
  if (isMobile) {
    // The sheet closes after navigating.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } else {
    await expect(page.getByRole("link", { name: "Recipes" })).toHaveAttribute("aria-current", "page");
  }
});

test("theme can be switched to dark", async ({ page }) => {
  await page.goto("/today");
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("unknown routes show a friendly 404", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
});
