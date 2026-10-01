import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/** Fixture users are in UTC; yesterday's meals are all in the past, so statuses are deterministic. */
function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function logDosa(page: Page, date: string, slot: string, amount = "2") {
  await page.goto(`/meals/add?date=${date}&slot=${slot}`);
  await page.getByLabel("Search foods").fill("dosa");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: /Dosa, plain/ }).click();
  await page.getByLabel("Amount", { exact: true }).fill(amount);
  await page.getByRole("button", { name: `Add to ${slot}` }).click();
  await expect(page).toHaveURL(new RegExp(`/meals\\?date=${date}$`));
}

const slotCard = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test("log food, correct it and remove it — totals follow", async ({ page, user }) => {
  void user;
  const date = yesterday();
  await logDosa(page, date, "Breakfast");

  const breakfast = slotCard(page, "Breakfast");
  await expect(breakfast.getByText("Logged")).toBeVisible();
  await expect(breakfast.getByRole("link", { name: /Dosa, plain/ })).toContainText("~220 kcal");
  await expect(page.getByRole("progressbar", { name: "Calories" })).toHaveAttribute(
    "aria-valuetext",
    /^220 \/ — kcal/,
  );

  // "Actually, I had one dosa."
  await breakfast.getByRole("link", { name: /Dosa, plain/ }).click();
  await page.getByLabel("Amount", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(slotCard(page, "Breakfast").getByRole("link", { name: /Dosa, plain/ })).toContainText(
    "~110 kcal",
  );

  await slotCard(page, "Breakfast")
    .getByRole("link", { name: /Dosa, plain/ })
    .click();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(slotCard(page, "Breakfast").getByText("Not logged")).toBeVisible();
});

test("an unlogged meal is not treated as skipped until the user says so", async ({ page, user }) => {
  void user;
  const date = yesterday();
  await page.goto(`/meals?date=${date}`);
  const lunch = slotCard(page, "Lunch");
  await expect(lunch.getByText("Not logged")).toBeVisible();
  await expect(lunch.getByText("Did you skip this, or just not log it yet?")).toBeVisible();
  await expect(page.getByText("Nothing logged yet — we won't guess what you ate.")).toBeVisible();

  await lunch.getByRole("button", { name: "I skipped it" }).click();
  await expect(lunch.getByText("Skipped")).toBeVisible();
  await lunch.getByRole("button", { name: "Undo skip" }).click();
  await expect(lunch.getByText("Not logged")).toBeVisible();
});

test("saved meals, day completion and history", async ({ page, user }) => {
  void user;
  const date = yesterday();
  await logDosa(page, date, "Breakfast");
  await expect(page.getByText("Some meals aren't logged yet")).toBeVisible();

  await slotCard(page, "Breakfast").getByRole("button", { name: "More options for Breakfast" }).click();
  await page.getByRole("menuitem", { name: "Save as a meal" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Dosa breakfast");
  await page.getByRole("dialog").getByRole("button", { name: "Save meal" }).click();
  await expect(page.getByText("Saved “Dosa breakfast”")).toBeVisible();

  await page.goto(`/meals/add?date=${date}&slot=Dinner`);
  await page
    .getByRole("listitem")
    .filter({ hasText: "Dosa breakfast" })
    .getByRole("button", { name: "Log" })
    .click();
  await expect(slotCard(page, "Dinner").getByRole("link", { name: /Dosa, plain/ })).toBeVisible();

  await page.getByRole("button", { name: "I've logged everything" }).click();
  await expect(page.getByText("Day marked complete")).toBeVisible();

  await page.goto("/meals/history?q=dosa");
  await expect(page.getByText("Breakfast:")).toBeVisible();
  await expect(page.getByText("Dinner:")).toBeVisible();
});

test("water and sleep on Today", async ({ page, user }) => {
  void user;
  await page.goto("/today");
  await page.getByRole("button", { name: "+500 ml" }).click();
  await expect(page.getByRole("progressbar", { name: "Water" })).toHaveAttribute(
    "aria-valuetext",
    /^500 \/ — ml/,
  );
  await page.getByRole("button", { name: "Undo 500 ml" }).click();
  await expect(page.getByRole("progressbar", { name: "Water" })).toHaveAttribute(
    "aria-valuetext",
    /^— \/ — ml/,
  );

  // Midnight today (UTC) has always passed, so this sleep has ended.
  await page.getByLabel("Went to bed").fill("16:00");
  await page.getByLabel("Woke up").fill("00:00");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Last night: 8 h")).toBeVisible();
});
