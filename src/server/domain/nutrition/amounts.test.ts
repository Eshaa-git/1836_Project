import { describe, expect, it } from "vitest";
import { divideTotals, scaleProfile, sumNutrients, totalsToPer100g } from "./amounts";
import { emptyProfile, type NutrientProfile } from "./nutrients";

const profile = (values: Partial<NutrientProfile>): NutrientProfile => ({ ...emptyProfile(), ...values });

describe("nutrient amounts", () => {
  it("scales per-100 g values to an amount and keeps unknowns unknown", () => {
    const egg = profile({ energyKcal: 143, proteinG: 12.6, vitaminDMcg: null });
    const two = scaleProfile(egg, 88);
    expect(two.energyKcal).toBeCloseTo(125.84);
    expect(two.proteinG).toBeCloseTo(11.088);
    expect(two.vitaminDMcg).toBeNull();
  });

  it("keeps a real zero distinct from unknown", () => {
    const meat = profile({ fiberG: 0 });
    expect(scaleProfile(meat, 150).fiberG).toBe(0);
  });

  it("rejects invalid amounts", () => {
    expect(() => scaleProfile(emptyProfile(), -1)).toThrow();
    expect(() => scaleProfile(emptyProfile(), Number.NaN)).toThrow();
  });

  it("sums items and marks a total incomplete when any item is unknown", () => {
    const { totals, isEstimate } = sumNutrients([
      { amounts: profile({ energyKcal: 100, vitaminDMcg: 1 }), isEstimate: false },
      { amounts: profile({ energyKcal: 50, vitaminDMcg: null }), isEstimate: true },
    ]);
    expect(totals.energyKcal).toEqual({ value: 150, complete: true });
    // Lower bound: "at least 1 µg"
    expect(totals.vitaminDMcg).toEqual({ value: 1, complete: false });
    expect(totals.zincMg).toEqual({ value: null, complete: false });
    expect(isEstimate).toBe(true);
  });

  it("treats an empty list as unknown, not zero", () => {
    expect(sumNutrients([]).totals.energyKcal).toEqual({ value: null, complete: false });
  });

  it("divides totals into servings", () => {
    const { totals } = sumNutrients([{ amounts: profile({ proteinG: 40 }), isEstimate: false }]);
    expect(divideTotals(totals, 4).proteinG).toEqual({ value: 10, complete: true });
  });

  it("only stores complete totals as per-100 g values", () => {
    const { totals } = sumNutrients([
      { amounts: profile({ energyKcal: 300, ironMg: 2 }), isEstimate: false },
      { amounts: profile({ energyKcal: 100, ironMg: null }), isEstimate: false },
    ]);
    const per100 = totalsToPer100g(totals, 200);
    expect(per100.energyKcal).toBe(200);
    expect(per100.ironMg).toBeNull();
  });
});
