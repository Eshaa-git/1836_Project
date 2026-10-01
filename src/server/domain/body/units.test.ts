import { describe, expect, it } from "vitest";
import { bmi, cmToFtIn, formatHeight, formatWeight, ftInToCm, kgToLb, lbToKg, round } from "./units";

describe("body units", () => {
  it("converts weight both ways", () => {
    expect(round(kgToLb(70), 2)).toBe(154.32);
    expect(round(lbToKg(154.32), 2)).toBe(70);
  });

  it("converts height both ways", () => {
    expect(round(ftInToCm(5, 7))).toBe(170.2);
    expect(cmToFtIn(170.2)).toEqual({ feet: 5, inches: 7 });
    expect(cmToFtIn(182.9)).toEqual({ feet: 6, inches: 0 });
  });

  it("computes BMI and returns null for missing inputs", () => {
    expect(round(bmi(70, 175)!, 1)).toBe(22.9);
    expect(bmi(null, 175)).toBeNull();
    expect(bmi(70, null)).toBeNull();
  });

  it("formats for the user's measurement system", () => {
    expect(formatWeight(70, "METRIC")).toBe("70 kg");
    expect(formatWeight(70, "IMPERIAL")).toBe("154.3 lb");
    expect(formatHeight(170.2, "IMPERIAL")).toBe("5′ 7″");
  });
});
