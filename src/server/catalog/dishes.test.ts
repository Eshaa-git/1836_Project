import { describe, expect, it } from "vitest";
import { DISHES, type DishDefinition } from "../../../prisma/seed/dishes";
import { emptyProfile } from "@/server/domain/nutrition/nutrients";
import { buildDish, type IngredientFood } from "./dishes";

const food = (name: string, kcal: number, allergens: IngredientFood["allergens"] = []): IngredientFood => ({
  name,
  per100g: { ...emptyProfile(), energyKcal: kcal, proteinG: 1 },
  allergens,
});

const def: DishDefinition = {
  slug: "test-dish",
  name: "Test dish",
  aliases: ["test"],
  ingredients: [
    { fdcId: "1", grams: 100 },
    { fdcId: "2", grams: 10, role: "COOKING_FAT" },
  ],
  cookedWeightG: 200,
  portions: [{ unit: "bowl", amount: 1, gramWeight: 250, label: "1 bowl" }],
};

describe("buildDish", () => {
  it("computes per-100 g nutrition from ingredients including cooking fat", () => {
    const dish = buildDish(
      def,
      new Map([
        ["1", food("Rice", 360)],
        ["2", food("Ghee", 876, ["milk"])],
      ]),
    );
    // (360 + 87.6) / 200 g * 100
    expect(dish.per100g.energyKcal).toBeCloseTo(223.8);
    // Unknown in the ingredients → unknown in the dish.
    expect(dish.per100g.ironMg).toBeNull();
    expect(dish.isEstimate).toBe(true);
    expect(dish.allergens).toEqual({ contains: ["milk"], assessment: "UNVERIFIED" });
    expect(dish.portions[0]).toMatchObject({ unit: "bowl", isEstimate: true });
  });

  it("refuses to build a dish with a missing ingredient", () => {
    expect(() => buildDish(def, new Map([["1", food("Rice", 360)]]))).toThrow(/isn't imported/);
  });

  it("has unique slugs and aliases that don't collide between dishes", () => {
    expect(new Set(DISHES.map((d) => d.slug)).size).toBe(DISHES.length);
    const aliases = DISHES.flatMap((d) => d.aliases.map((a) => a.toLowerCase()));
    expect(new Set(aliases).size).toBe(aliases.length);
  });
});
