import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { foodPreferencesSchema } from "@/lib/validation/profile";
import { createContext, type UserContext } from "@/server/lib/context";
import { db } from "@/server/lib/db";
import { getFoodDetail, searchFoods } from "@/server/services/foods";
import { saveFoodPreferences } from "@/server/services/profile";
import { seedTestCatalog } from "../fixtures/catalog";
import { createTestUser, resetDatabase } from "./helpers";

let ids: Record<string, string>;
let ctx: UserContext;

beforeEach(async () => {
  await resetDatabase();
  ids = await seedTestCatalog(db);
  const user = await createTestUser("f@example.com");
  ctx = createContext({ userId: user.id }) as UserContext;
});
afterAll(() => db.$disconnect());

describe("searchFoods", () => {
  it("ranks the everyday food first for a common name", async () => {
    const results = await searchFoods(ctx.userId, "egg");
    expect(results[0]?.name).toBe("Egg, whole, raw, fresh");
  });

  it("finds curated dishes by alias and marks them as estimates", async () => {
    const [dosa] = await searchFoods(ctx.userId, "dosai");
    expect(dosa).toMatchObject({ name: "Dosa, plain (home-style)", isEstimate: true, source: "CURATED" });
  });

  it("tolerates typos", async () => {
    expect((await searchFoods(ctx.userId, "potatos"))[0]?.name).toMatch(/^Potatoes/);
  });

  it("returns nothing for very short or empty queries", async () => {
    expect(await searchFoods(ctx.userId, "e")).toEqual([]);
    expect(await searchFoods(ctx.userId, "   ")).toEqual([]);
  });

  it("is safe against SQL-looking input", async () => {
    await expect(searchFoods(ctx.userId, "egg'; drop table foods; --")).resolves.toBeInstanceOf(Array);
    expect(await db.food.count()).toBeGreaterThan(0);
  });

  it("flags foods that conflict with the user's allergies in results", async () => {
    await saveFoodPreferences(
      ctx,
      foodPreferencesSchema.parse({
        restrictions: [{ kind: "ALLERGY", label: "Peanuts", allergenCode: "peanut" }],
      }),
    );
    const [pb] = await searchFoods(ctx.userId, "peanut butter");
    expect(pb?.topFinding).toMatchObject({ level: "danger" });
    const [egg] = await searchFoods(ctx.userId, "egg");
    expect(egg?.topFinding).toBeNull();
  });
});

describe("getFoodDetail", () => {
  it("returns nutrients with unknowns preserved, portions and allergens", async () => {
    const egg = await getFoodDetail(ctx.userId, ids["Egg, whole, raw, fresh"]!);
    expect(egg.per100g.energyKcal).toBe(143);
    expect(egg.per100g.ironMg).toBeNull();
    expect(egg.portions.some((p) => p.unit === "medium")).toBe(true);
    expect(egg.allergens).toEqual({ contains: ["egg"], mayContain: [], assessment: "ASSESSED" });
  });

  it("warns users with allergies that a curated dish's allergens can't be confirmed", async () => {
    await saveFoodPreferences(
      ctx,
      foodPreferencesSchema.parse({
        restrictions: [{ kind: "ALLERGY", label: "Sesame", allergenCode: "sesame" }],
      }),
    );
    const dosa = await getFoodDetail(ctx.userId, ids["Dosa, plain (home-style)"]!);
    expect(dosa.findings).toEqual([expect.objectContaining({ level: "warning" })]);
  });

  it("applies the diet type", async () => {
    await saveFoodPreferences(ctx, foodPreferencesSchema.parse({ dietType: "VEGAN" }));
    const egg = await getFoodDetail(ctx.userId, ids["Egg, whole, raw, fresh"]!);
    expect(egg.findings[0]?.message).toMatch(/egg/i);
  });

  it("hides another user's private foods and unknown ids", async () => {
    const other = await createTestUser("other@example.com");
    const privateFood = await db.food.create({
      data: {
        source: "USER",
        sourceId: "x",
        userId: other.id,
        name: "Grandma's laddoo",
        searchText: "grandma's laddoo",
      },
    });
    await expect(getFoodDetail(ctx.userId, privateFood.id)).rejects.toThrow("not found");
    expect(await searchFoods(ctx.userId, "laddoo")).toEqual([]);
    expect((await searchFoods(other.id, "laddoo"))[0]?.name).toBe("Grandma's laddoo");
  });
});
