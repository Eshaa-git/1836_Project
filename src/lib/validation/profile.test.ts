import { describe, expect, it } from "vitest";
import {
  basicsSchema,
  dailyTargetsSchema,
  foodPreferencesSchema,
  measurementSchema,
  routineSchema,
} from "./profile";

describe("profile validation", () => {
  const basics = {
    name: "Riya",
    birthDate: "1995-04-12",
    sex: null,
    heightCm: "165",
    weightKg: "",
    measurementSystem: "METRIC",
    timezone: "Asia/Kolkata",
  };

  it("accepts basics with an optional blank weight (unknown, not zero)", () => {
    const parsed = basicsSchema.parse(basics);
    expect(parsed.heightCm).toBe(165);
    expect(parsed.weightKg).toBeNull();
  });

  it("rejects an invalid timezone and implausible height", () => {
    expect(basicsSchema.safeParse({ ...basics, timezone: "Nowhere/City" }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...basics, heightCm: 20 }).success).toBe(false);
  });

  it("keeps the four restriction categories distinct and normalises fields", () => {
    const parsed = foodPreferencesSchema.parse({
      restrictions: [
        { kind: "ALLERGY", label: "Peanuts", allergenCode: "peanut" },
        { kind: "INTOLERANCE", label: "Lactose", allergenCode: "milk", severity: "SEVERE" },
        { kind: "AVOID", label: "Mushrooms", allergenCode: "milk" },
        { kind: "OTHER", label: "No beef" },
      ],
    });
    expect(parsed.restrictions.map((r) => [r.kind, r.allergenCode, r.severity])).toEqual([
      ["ALLERGY", "peanut", "UNKNOWN"],
      ["INTOLERANCE", "milk", null],
      ["AVOID", null, null],
      ["OTHER", null, null],
    ]);
  });

  it("allows the same food in different categories but not twice in one", () => {
    expect(
      foodPreferencesSchema.safeParse({
        restrictions: [
          { kind: "ALLERGY", label: "Milk" },
          { kind: "AVOID", label: "milk" },
        ],
      }).success,
    ).toBe(true);
    expect(
      foodPreferencesSchema.safeParse({
        restrictions: [
          { kind: "ALLERGY", label: "Milk" },
          { kind: "ALLERGY", label: "milk" },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown allergen codes", () => {
    expect(
      foodPreferencesSchema.safeParse({
        restrictions: [{ kind: "ALLERGY", label: "x", allergenCode: "nuts" }],
      }).success,
    ).toBe(false);
  });

  it("treats blank target fields as 'no target' rather than zero", () => {
    const parsed = dailyTargetsSchema.parse({ caloriesKcal: "2000", proteinG: "", waterMl: "2500" });
    expect(parsed).toMatchObject({ caloriesKcal: 2000, proteinG: null, waterMl: 2500, fatG: null });
  });

  it("requires at least one value in a measurement", () => {
    expect(measurementSchema.safeParse({ localDate: "2026-09-30" }).success).toBe(false);
    expect(measurementSchema.safeParse({ localDate: "2026-09-30", waistCm: "80" }).success).toBe(true);
  });

  it("validates routine times", () => {
    expect(routineSchema.safeParse({ wakeTime: "7am" }).success).toBe(false);
    expect(routineSchema.parse({ wakeTime: "07:00", mealsPerDay: "4" })).toMatchObject({ mealsPerDay: 4 });
  });
});
