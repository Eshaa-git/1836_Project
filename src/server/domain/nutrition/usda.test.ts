import { describe, expect, it } from "vitest";
import sample from "../../../../tests/fixtures/usda-sample.json";
import { cleanUsdaName, mapUsdaFood, parseUsdaPortion, type UsdaFood } from "./usda";

const foods = sample as UsdaFood[];
const byId = (id: number) => mapUsdaFood(foods.find((f) => f.fdcId === id)!);

describe("parseUsdaPortion", () => {
  it("normalizes measures, sizes and counts", () => {
    expect(parseUsdaPortion({ amount: 1, modifier: "cup, chopped", gramWeight: 160 })).toMatchObject({
      unit: "cup",
      label: "1 cup, chopped",
    });
    expect(parseUsdaPortion({ amount: 1, modifier: 'medium (2-1/2" dia)', gramWeight: 110 })?.unit).toBe(
      "medium",
    );
    expect(
      parseUsdaPortion({ amount: 1, modifier: 'Potato small (1-3/4" to 2-1/2" dia)', gramWeight: 170 })?.unit,
    ).toBe("small");
    expect(
      parseUsdaPortion({ amount: 1, modifier: 'slice, medium (1/8" thick)', gramWeight: 14 })?.unit,
    ).toBe("slice");
    expect(parseUsdaPortion({ amount: 1, modifier: "extra large", gramWeight: 56 })?.unit).toBe(
      "extra_large",
    );
    expect(parseUsdaPortion({ amount: 1, modifier: "fl oz", gramWeight: 30.5 })?.unit).toBe("fl_oz");
    expect(parseUsdaPortion({ amount: 0.5, modifier: "cup, diced", gramWeight: 75 })).toMatchObject({
      unit: "cup",
      amount: 0.5,
    });
  });

  it("drops mass-based and invalid portions", () => {
    expect(parseUsdaPortion({ amount: 3, modifier: "oz", gramWeight: 85 })).toBeNull();
    expect(parseUsdaPortion({ amount: 1, modifier: "cup", gramWeight: 0 })).toBeNull();
  });
});

describe("mapUsdaFood", () => {
  it("maps nutrients, keeping missing ones unknown", () => {
    const egg = byId(171287);
    expect(egg.name).toBe("Egg, whole, raw, fresh");
    expect(egg.per100g.energyKcal).toBe(143);
    expect(egg.per100g.proteinG).toBeCloseTo(12.56, 1);
    // Not in the fixture → unknown, not zero.
    expect(egg.per100g.ironMg).toBeNull();
    expect(egg.allergens).toEqual({ contains: ["egg"], assessment: "ASSESSED" });
  });

  it("keeps household portions for unit conversion", () => {
    const egg = byId(171287);
    expect(egg.portions.find((p) => p.unit === "medium")?.gramWeight).toBe(44);
    const potato = byId(170026);
    expect(potato.portions.map((p) => p.unit)).toEqual(expect.arrayContaining(["small", "large", "cup"]));
  });
});

describe("cleanUsdaName", () => {
  it("drops the distribution-program note", () => {
    expect(cleanUsdaName("Oats (Includes foods for USDA's Food Distribution Program)")).toBe("Oats");
  });
});
