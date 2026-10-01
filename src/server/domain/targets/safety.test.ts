import { describe, expect, it } from "vitest";
import { checkDailyTargets, type DailyTargetsInput, type TargetSafetyContext } from "./safety";

const none: DailyTargetsInput = {
  caloriesKcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  waterMl: null,
  sleepHours: null,
};
const adult: TargetSafetyContext = { sex: "FEMALE", age: 30, weightKg: 65 };
const codes = (t: Partial<DailyTargetsInput>, ctx = adult) =>
  checkDailyTargets({ ...none, ...t }, ctx).map((i) => `${i.severity}:${i.code}`);

describe("checkDailyTargets", () => {
  it("accepts empty targets (nothing set is valid)", () => {
    expect(codes({})).toEqual([]);
  });

  it("accepts a typical balanced set", () => {
    expect(
      codes({
        caloriesKcal: 2000,
        proteinG: 120,
        carbsG: 220,
        fatG: 70,
        fiberG: 30,
        waterMl: 2500,
        sleepHours: 8,
      }),
    ).toEqual([]);
  });

  it("blocks implausible calories and warns on very low ones using sex-specific floors", () => {
    expect(codes({ caloriesKcal: 500 })).toEqual(["block:CALORIES_IMPLAUSIBLE"]);
    expect(codes({ caloriesKcal: 1100 })).toEqual(["warn:CALORIES_VERY_LOW"]);
    expect(codes({ caloriesKcal: 1300 })).toEqual([]);
    expect(codes({ caloriesKcal: 1300 }, { ...adult, sex: "MALE" })).toEqual(["warn:CALORIES_VERY_LOW"]);
    // Unknown sex uses the lower, less restrictive floor.
    expect(codes({ caloriesKcal: 1300 }, { ...adult, sex: null })).toEqual([]);
  });

  it("warns on protein above 3 g/kg only when weight is known", () => {
    expect(codes({ proteinG: 220 })).toEqual(["warn:PROTEIN_VERY_HIGH"]);
    expect(codes({ proteinG: 220 }, { ...adult, weightKg: null })).toEqual([]);
  });

  it("warns when macros don't add up to the calorie target", () => {
    expect(codes({ caloriesKcal: 2000, proteinG: 100, carbsG: 100, fatG: 50 })).toContain(
      "warn:MACROS_DONT_ADD_UP",
    );
    expect(codes({ caloriesKcal: 2000, proteinG: 150, carbsG: 200, fatG: 67 })).toEqual([]);
  });

  it("warns on very low fat relative to calories", () => {
    expect(codes({ caloriesKcal: 2000, fatG: 25 })).toEqual(["warn:FAT_VERY_LOW"]);
  });

  it("flags extreme water and sleep", () => {
    expect(codes({ waterMl: 12000 })).toEqual(["block:WATER_IMPLAUSIBLE"]);
    expect(codes({ waterMl: 6000 })).toEqual(["warn:WATER_VERY_HIGH"]);
    expect(codes({ sleepHours: 5 })).toEqual(["warn:SLEEP_LOW"]);
    expect(codes({ sleepHours: 1 })).toEqual(["block:SLEEP_IMPLAUSIBLE"]);
  });

  it("asks under-18s to involve a professional", () => {
    expect(codes({ caloriesKcal: 2200 }, { ...adult, age: 16 })).toEqual(["warn:UNDER_18"]);
    expect(codes({}, { ...adult, age: 16 })).toEqual([]);
  });
});
