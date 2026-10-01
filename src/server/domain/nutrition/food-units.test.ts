import { describe, expect, it } from "vitest";
import { densityOf, normalizeUnit, parseQuantity, resolveGrams, type FoodForUnits } from "./food-units";

const egg: FoodForUnits = {
  name: "Egg, whole, raw, fresh",
  category: "Dairy and Egg Products",
  portions: [
    { unit: "cup", amount: 1, gramWeight: 243, label: "1 cup (4.86 large eggs)" },
    { unit: "small", amount: 1, gramWeight: 38, label: "1 small" },
    { unit: "medium", amount: 1, gramWeight: 44, label: "1 medium" },
    { unit: "large", amount: 1, gramWeight: 50, label: "1 large" },
  ],
};
const yogurt: FoodForUnits = {
  name: "Yogurt, plain, whole milk",
  category: "Dairy and Egg Products",
  portions: [
    { unit: "cup", amount: 1, gramWeight: 245, label: "1 cup (8 fl oz)" },
    { unit: "container", amount: 1, gramWeight: 170, label: "1 container (6 oz)" },
  ],
};
const onion: FoodForUnits = {
  name: "Onions, raw",
  category: "Vegetables and Vegetable Products",
  portions: [
    { unit: "cup", amount: 1, gramWeight: 160, label: "1 cup, chopped" },
    { unit: "cup", amount: 1, gramWeight: 115, label: "1 cup, sliced" },
    { unit: "medium", amount: 1, gramWeight: 110, label: '1 medium (2-1/2" dia)' },
  ],
};
const rice: FoodForUnits = {
  name: "Rice, white, cooked",
  category: "Cereal Grains and Pasta",
  portions: [{ unit: "cup", amount: 1, gramWeight: 158, label: "1 cup" }],
};
const naan: FoodForUnits = {
  name: "Bread, naan, plain",
  category: "Baked Products",
  portions: [{ unit: "piece", amount: 1, gramWeight: 90, label: "1 piece" }],
};
const chicken: FoodForUnits = { name: "Chicken breast, roasted", category: "Poultry Products", portions: [] };
const tea: FoodForUnits = { name: "Tea, brewed", category: "Beverages", portions: [] };

describe("normalizeUnit", () => {
  it("maps common spellings", () => {
    expect(normalizeUnit("Tablespoons")).toBe("tbsp");
    expect(normalizeUnit("grams")).toBe("g");
    expect(normalizeUnit("fl oz")).toBe("fl_oz");
    expect(normalizeUnit("")).toBe("piece");
    expect(normalizeUnit("slices")).toBe("slice");
    expect(normalizeUnit("cloves")).toBe("clove");
    expect(normalizeUnit("berries")).toBe("berry");
    expect(normalizeUnit("glasses")).toBe("glass");
    expect(normalizeUnit("glass")).toBe("glass");
    expect(normalizeUnit("dishes")).toBe("dish");
  });
});

describe("resolveGrams", () => {
  it("converts mass units exactly", () => {
    expect(resolveGrams(chicken, 150, "g")).toMatchObject({ ok: true, grams: 150, isEstimate: false });
    const oz = resolveGrams(chicken, 4, "oz");
    expect(oz.ok && oz.grams).toBeCloseTo(113.4, 1);
  });

  it("uses the food's own portion for the unit", () => {
    expect(resolveGrams(egg, 2, "large")).toMatchObject({
      ok: true,
      grams: 100,
      method: "portion",
      isEstimate: false,
    });
    expect(resolveGrams(rice, 0.5, "cups")).toMatchObject({ ok: true, grams: 79 });
  });

  it("assumes medium for plain counts like '2 eggs' and labels it an estimate", () => {
    expect(resolveGrams(egg, 2)).toMatchObject({
      ok: true,
      grams: 88,
      isEstimate: true,
      method: "assumed",
      note: "Assumed medium ones",
    });
  });

  it("uses an explicit piece portion exactly", () => {
    expect(resolveGrams(naan, 1)).toMatchObject({
      ok: true,
      grams: 90,
      method: "portion",
      isEstimate: false,
    });
  });

  it("falls back to a food's only count portion as an estimate", () => {
    const drumstick: FoodForUnits = {
      name: "Chicken drumstick, roasted",
      category: "Poultry Products",
      portions: [{ unit: "drumstick", amount: 1, gramWeight: 71, label: "1 drumstick" }],
    };
    expect(resolveGrams(drumstick, 2)).toMatchObject({
      ok: true,
      grams: 142,
      isEstimate: true,
      method: "assumed",
    });
    expect(resolveGrams(drumstick, 2, "drumsticks")).toMatchObject({
      ok: true,
      grams: 142,
      isEstimate: false,
    });
  });

  it("derives grams from the food's density for other volume units", () => {
    // Half a cup of yogurt = 122.5 g; 2 tbsp via density (245 g / 236.6 ml).
    expect(resolveGrams(yogurt, 0.5, "cup")).toMatchObject({ ok: true, grams: 122.5 });
    const tbsp = resolveGrams(yogurt, 2, "tbsp");
    expect(tbsp).toMatchObject({ ok: true, method: "density", isEstimate: false });
    expect(tbsp.ok && tbsp.grams).toBeCloseTo(30.6, 1);
  });

  it("asks which one when a unit has very different weights (chopped vs sliced)", () => {
    const result = resolveGrams(onion, 1, "cup");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.options.map((o) => o.grams)).toEqual([160, 115]);
    expect(densityOf(onion)).toBeNull();
  });

  it("estimates household vessels and says so", () => {
    const bowl = resolveGrams(yogurt, 1, "bowl");
    expect(bowl).toMatchObject({ ok: true, isEstimate: true });
    expect(bowl.ok && bowl.note).toMatch(/250 ml/);
  });

  it("assumes water-like density only for drinks", () => {
    expect(resolveGrams(tea, 1, "cup")).toMatchObject({
      ok: true,
      grams: 236.588,
      isEstimate: true,
      method: "assumed",
    });
    expect(resolveGrams(chicken, 1, "cup").ok).toBe(false);
  });

  it("asks for clarification instead of guessing an unknown size or count", () => {
    expect(resolveGrams(rice, 1, "medium").ok).toBe(false);
    expect(resolveGrams(chicken, 1).ok).toBe(false);
    expect(resolveGrams(egg, 1, "jumbo")).toMatchObject({ ok: false, reason: "needs_clarification" });
  });

  it("rejects non-positive quantities", () => {
    expect(() => resolveGrams(egg, 0)).toThrow();
  });
});

describe("parseQuantity", () => {
  it("parses numbers, fractions and words", () => {
    expect(parseQuantity("2")).toBe(2);
    expect(parseQuantity("1.5")).toBe(1.5);
    expect(parseQuantity("1/2")).toBe(0.5);
    expect(parseQuantity("1 1/2")).toBe(1.5);
    expect(parseQuantity("½")).toBe(0.5);
    expect(parseQuantity("1½")).toBe(1.5);
    expect(parseQuantity("half")).toBe(0.5);
    expect(parseQuantity("a")).toBe(1);
    expect(parseQuantity("three")).toBe(3);
  });

  it("returns null for nonsense or non-positive values", () => {
    expect(parseQuantity("some")).toBeNull();
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("1/0")).toBeNull();
  });
});
