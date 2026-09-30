import { describe, expect, it } from "vitest";
import { describeNutrientProgress } from "./nutrient-progress";

describe("describeNutrientProgress", () => {
  it("formats consumed vs target", () => {
    expect(describeNutrientProgress(1750, 2000, "kcal")).toEqual({
      state: "under",
      percent: 88,
      label: "1,750 / 2,000 kcal",
    });
  });

  it("treats a missing log as unknown, not zero", () => {
    const p = describeNutrientProgress(null, 150, "g");
    expect(p.state).toBe("not-logged");
    expect(p.percent).toBeNull();
    expect(p.label).toBe("— / 150 g");
  });

  it("distinguishes a real zero from unknown", () => {
    const p = describeNutrientProgress(0, 150, "g");
    expect(p.state).toBe("under");
    expect(p.percent).toBe(0);
    expect(p.label).toBe("0 / 150 g");
  });

  it("reports no-target before anything else", () => {
    expect(describeNutrientProgress(null, null, "g").state).toBe("no-target");
    expect(describeNutrientProgress(40, null, "g").state).toBe("no-target");
  });

  it("marks met and over using the tolerance, capping the bar at 100", () => {
    expect(describeNutrientProgress(150, 150, "g").state).toBe("met");
    expect(describeNutrientProgress(164, 150, "g").state).toBe("met");
    const over = describeNutrientProgress(2400, 2000, "kcal");
    expect(over.state).toBe("over");
    expect(over.percent).toBe(100);
  });
});
