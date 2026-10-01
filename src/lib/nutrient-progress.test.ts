import { describe, expect, it } from "vitest";
import { describeNutrientProgress, describeRemaining } from "./nutrient-progress";

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

describe("describeRemaining", () => {
  it("describes exact, upper-bound, over and unknown remaining", () => {
    expect(describeRemaining({ status: "exact", value: 320, over: false }, "kcal")).toBe("320 kcal left");
    expect(describeRemaining({ status: "at_most", value: 320, over: false }, "kcal")).toBe(
      "At most 320 kcal left",
    );
    expect(describeRemaining({ status: "exact", value: 0, over: true }, "kcal", 120)).toBe(
      "120 kcal over target",
    );
    expect(describeRemaining({ status: "unknown" }, "kcal")).toMatch(/Can't tell/);
    expect(describeRemaining({ status: "no_target" }, "kcal")).toBeNull();
  });

  it("marks eaten amounts that are only a minimum", () => {
    expect(describeNutrientProgress(420, 2000, "kcal", 0.1, true).label).toBe("≥ 420 / 2,000 kcal");
  });
});
