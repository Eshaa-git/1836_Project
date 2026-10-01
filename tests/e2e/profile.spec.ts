import { expect, PASSWORD, test, uniqueEmail } from "./fixtures";

test("a new user completes onboarding and sees their targets on Today", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Asha");
  await page.getByLabel("Email").fill(uniqueEmail("onboard"));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  // 1. Basics (required — no skip)
  await expect(page).toHaveURL(/\/onboarding\/basics$/);
  await expect(page.getByText("Skip for now")).toHaveCount(0);
  await page.getByLabel("Date of birth").fill("1994-06-15");
  await page.getByLabel("Height (cm)").fill("162");
  await page.getByLabel(/Current weight \(kg\)/).fill("68");
  await page.getByRole("button", { name: "Continue" }).click();

  // 2. Goal
  await expect(page).toHaveURL(/\/onboarding\/goal$/);
  await page.getByRole("radio", { name: /Lose fat/ }).click();
  await expect(page.getByText("68 kg")).toBeVisible(); // starting point from the weight just entered
  await page.getByLabel("Target (kg)").fill("63");
  await page.getByRole("button", { name: "Continue" }).click();

  // 3. Food — allergies and intolerances are separate
  await expect(page).toHaveURL(/\/onboarding\/food$/);
  await page
    .getByRole("group", { name: "Common allergens" })
    .getByRole("button", { name: "Peanuts" })
    .click();
  await page.getByLabel("Intolerances", { exact: true }).fill("Lactose");
  await page.getByLabel("Intolerances", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Continue" }).click();

  // 4. Routine — skipped
  await expect(page).toHaveURL(/\/onboarding\/routine$/);
  await page.getByRole("link", { name: "Skip for now" }).click();

  // 5. Targets — a very low calorie target needs explicit acknowledgement
  await expect(page).toHaveURL(/\/onboarding\/targets$/);
  await page.getByLabel("Calories (kcal)").fill("1100");
  await page.getByLabel("Protein (g)").fill("100");
  await expect(page.getByText(/below 1,200 kcal/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Review the notes above" })).toBeDisabled();
  await page.getByLabel("I understand and want to keep this").check();
  await page.getByRole("button", { name: "Continue" }).click();

  // 6. Motivation
  await expect(page).toHaveURL(/\/onboarding\/motivation$/);
  await page.getByLabel(/Who or what got you started/).fill("Keeping up with my daughter");
  await page.getByRole("button", { name: "Finish" }).click();

  // Summary → Today
  await expect(page).toHaveURL(/\/onboarding\/done$/);
  await expect(page.getByRole("heading", { name: "You're all set, Asha" })).toBeVisible();
  await page.getByRole("button", { name: "Go to Today" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("progressbar", { name: "Calories" })).toHaveAttribute(
    "aria-valuetext",
    /— \/ 1,100 kcal, not logged yet/,
  );

  // The profile shows the four restriction categories separately.
  await page.goto("/profile");
  await expect(page.getByText("Peanuts")).toBeVisible();
  await expect(page.getByText("Intolerances")).toBeVisible();
  await expect(page.getByText("Lactose")).toBeVisible();
});

test("unfinished setup sends the user back to onboarding", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Lee");
  await page.getByLabel("Email").fill(uniqueEmail("unfinished"));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding\/basics$/);

  await page.goto("/today");
  await expect(page).toHaveURL(/\/onboarding\/basics$/);
  await page.goto("/onboarding/targets");
  await expect(page).toHaveURL(/\/onboarding\/basics$/); // basics are required first
});

test("changing targets keeps a history", async ({ page, user }) => {
  void user;
  await page.goto("/profile/targets");
  await page.getByLabel("Calories (kcal)").fill("2000");
  await page.getByRole("button", { name: "Save targets" }).click();
  await expect(page.getByText("Targets saved")).toBeVisible();

  await page.getByLabel("Calories (kcal)").fill("1900");
  await page.getByLabel(/Why are you setting these/).fill("Dietitian advice");
  await page.getByRole("button", { name: "Save targets" }).click();

  const history = page
    .getByRole("heading", { name: "History" })
    .locator("xpath=ancestor::*[@data-slot='card'][1]");
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history.getByText("1,900 kcal")).toBeVisible();
  await expect(history.getByText("“Dietitian advice”")).toBeVisible();
});

test("implausible targets are blocked", async ({ page, user }) => {
  void user;
  await page.goto("/profile/targets");
  await page.getByLabel("Water (ml)").fill("15000");
  await expect(page.getByText("Water must be between 250 ml and 10,000 ml per day.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Adjust the highlighted values" })).toBeDisabled();
});

test("goals can be set, edited and their history reviewed", async ({ page, user }) => {
  void user;
  await page.goto("/profile/goal");
  await page.getByRole("radio", { name: /Build muscle/ }).click();
  await page.getByLabel("Where you are now (kg)").fill("60");
  await page.getByLabel("Target (kg)").fill("64");
  await page.getByRole("button", { name: "Save goal" }).click();

  await expect(page.getByText("Build muscle").first()).toBeVisible();
  await expect(page.getByText("60 kg")).toBeVisible();

  await page.getByRole("link", { name: "Edit goal" }).click();
  await page.getByLabel("Target (kg)").fill("65");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText(/Edited\. Target value: 64 kg → 65 kg/)).toBeVisible();
  await expect(page.getByText("Goal created")).toBeVisible();
});

test("a goal below a healthy weight is not accepted", async ({ page, user }) => {
  void user; // fixture profile: 168 cm
  await page.goto("/profile/goal");
  await page.getByRole("radio", { name: /Lose weight/ }).click();
  await page.getByLabel("Where you are now (kg)").fill("60");
  await page.getByLabel("Target (kg)").fill("45");
  await expect(page.getByText(/well below a healthy weight range/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Adjust the goal above" })).toBeDisabled();
});

test("body measurements can be added and removed", async ({ page, user }) => {
  void user;
  await page.goto("/profile/measurements");
  await page.getByLabel("Weight (kg)").fill("70.4");
  await page.getByText("More measurements (optional)").click();
  await page.getByLabel("Waist (cm)").fill("81");
  await page.getByRole("button", { name: "Add measurement" }).click();
  await expect(page.getByText("70.4 kg · waist 81 cm")).toBeVisible();

  await page.getByRole("button", { name: /Delete measurement/ }).click();
  await expect(page.getByText("No measurements yet.")).toBeVisible();
});
