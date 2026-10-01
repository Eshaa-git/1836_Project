import { addRestrictionInDb, expect, test } from "./fixtures";

test("search finds a curated dish and the calculator scales nutrition", async ({ page, user }) => {
  void user;
  await page.goto("/meals");
  await page.getByRole("link", { name: "Look up a food" }).click();
  await page.getByLabel("Search foods").fill("dosai");
  await page.getByRole("button", { name: "Search" }).click();

  const result = page.getByRole("link", { name: /Dosa, plain/ });
  await expect(result).toBeVisible();
  await expect(result.getByText("Estimate")).toBeVisible();
  await result.click();

  await expect(page.getByRole("heading", { level: 1, name: /Dosa, plain/ })).toBeVisible();
  // 1 dosa = 55 g of a 200 kcal/100 g fixture dish = 110 kcal (estimate).
  await expect(page.getByText(/^= ~55 g/)).toBeVisible();
  const forAmount = page.getByRole("region", { name: "For this amount" });
  await expect(forAmount.getByText("~110 kcal")).toBeVisible();

  await page.getByLabel("Amount", { exact: true }).fill("2");
  await expect(forAmount.getByText("~220 kcal")).toBeVisible();
  await expect(page.getByText("How we estimated this")).toBeVisible();
});

test("plain counts assume a medium size and say so; unknown values aren't zero", async ({ page, user }) => {
  void user;
  await page.goto("/meals/foods?q=egg");
  await page.getByRole("link", { name: /Egg, whole, raw, fresh/ }).click();
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: "pieces / whole" });
  await page.getByLabel("Amount", { exact: true }).fill("2");
  await expect(page.getByText(/88 g · Assumed medium ones/)).toBeVisible();

  // Iron isn't in the fixture data → shown as Unknown, never 0.
  await page.getByRole("region", { name: "Per 100 g" }).getByText("More nutrients").click();
  const perHundred = page.getByRole("region", { name: "Per 100 g" });
  await expect(perHundred.getByText("Iron").locator("xpath=..").getByText("Unknown")).toBeVisible();
});

test("ambiguous units ask for clarification", async ({ page, user }) => {
  void user;
  await page.goto("/meals/foods?q=onions");
  await page.getByRole("link", { name: /Onions, raw/ }).click();
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: "cups" });
  await expect(page.getByText(/can mean different amounts/)).toBeVisible();
  await page.getByRole("button", { name: /1 cup, chopped/ }).click();
  await expect(page.getByText(/= 160 g/)).toBeVisible();
});

test("foods containing a recorded allergen are clearly flagged", async ({ page, user }) => {
  await addRestrictionInDb(user.email, { kind: "ALLERGY", label: "Peanuts", allergenCode: "peanut" });
  await page.goto("/meals/foods?q=peanut%20butter");
  const result = page.getByRole("link", { name: /Peanut butter/ });
  await expect(result.getByText("Allergen")).toBeVisible();
  await result.click();
  await expect(page.getByRole("alert").filter({ hasText: "Not safe for you" })).toBeVisible();
  await expect(page.getByText("Contains peanuts — you're allergic.")).toBeVisible();
});

test("foods we don't have get an honest empty state", async ({ page, user }) => {
  void user;
  await page.goto("/meals/foods?q=paneer");
  await expect(page.getByText("No match for “paneer”")).toBeVisible();
});
