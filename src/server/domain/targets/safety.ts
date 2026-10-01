import { PROFESSIONAL_NOTE, type SafetyIssue } from "../safety/types";

/** Daily targets as entered. `null` means "no target for this". */
export type DailyTargetsInput = {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  waterMl: number | null;
  sleepHours: number | null;
};

export type TargetSafetyContext = {
  sex: "FEMALE" | "MALE" | "INTERSEX" | "PREFER_NOT_TO_SAY" | null;
  age: number | null;
  weightKg: number | null;
};

/**
 * Deterministic plausibility and safety checks for user-entered targets.
 * These are conservative general-population thresholds, not medical advice;
 * they exist to flag extreme values, never to prescribe.
 */
export function checkDailyTargets(t: DailyTargetsInput, ctx: TargetSafetyContext): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const block = (code: string, field: string, message: string) =>
    issues.push({ code, field, severity: "block", message });
  const warn = (code: string, field: string, message: string) =>
    issues.push({ code, field, severity: "warn", message });

  if (t.caloriesKcal !== null) {
    const floor = ctx.sex === "MALE" ? 1500 : 1200;
    if (t.caloriesKcal < 800 || t.caloriesKcal > 8000) {
      block("CALORIES_IMPLAUSIBLE", "caloriesKcal", "Calories must be between 800 and 8,000 kcal per day.");
    } else if (t.caloriesKcal < floor) {
      warn(
        "CALORIES_VERY_LOW",
        "caloriesKcal",
        `${t.caloriesKcal} kcal is below ${floor.toLocaleString("en-US")} kcal, a common minimum for adults without medical supervision. ${PROFESSIONAL_NOTE}`,
      );
    } else if (t.caloriesKcal > 5000) {
      warn("CALORIES_VERY_HIGH", "caloriesKcal", "Over 5,000 kcal a day is unusually high for most people.");
    }
  }

  if (t.proteinG !== null) {
    if (t.proteinG > 500) block("PROTEIN_IMPLAUSIBLE", "proteinG", "Protein must be 500 g or less per day.");
    else if (ctx.weightKg !== null && t.proteinG / ctx.weightKg > 3.0) {
      warn(
        "PROTEIN_VERY_HIGH",
        "proteinG",
        `That's ${(t.proteinG / ctx.weightKg).toFixed(1)} g per kg of body weight — above the ~2–2.2 g/kg that most people benefit from. Very high intakes may not suit people with kidney conditions.`,
      );
    }
  }

  if (t.carbsG !== null && t.carbsG > 1000)
    block("CARBS_IMPLAUSIBLE", "carbsG", "Carbs must be 1,000 g or less per day.");

  if (t.fatG !== null) {
    if (t.fatG > 400) block("FAT_IMPLAUSIBLE", "fatG", "Fat must be 400 g or less per day.");
    else if (t.caloriesKcal && (t.fatG * 9) / t.caloriesKcal < 0.15) {
      warn(
        "FAT_VERY_LOW",
        "fatG",
        "Fat under 15% of calories is very low; some fat is needed to absorb vitamins A, D, E and K.",
      );
    }
  }

  if (t.fiberG !== null) {
    if (t.fiberG > 150) block("FIBER_IMPLAUSIBLE", "fiberG", "Fiber must be 150 g or less per day.");
    else if (t.fiberG > 70)
      warn("FIBER_VERY_HIGH", "fiberG", "Over 70 g of fiber a day can cause digestive discomfort.");
  }

  if (t.caloriesKcal !== null && t.proteinG !== null && t.carbsG !== null && t.fatG !== null) {
    const macroKcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    const diff = Math.abs(macroKcal - t.caloriesKcal) / t.caloriesKcal;
    if (diff > 0.15) {
      warn(
        "MACROS_DONT_ADD_UP",
        "caloriesKcal",
        `Your protein, carbs and fat add up to about ${Math.round(macroKcal).toLocaleString("en-US")} kcal, which is ${Math.round(diff * 100)}% different from your calorie target.`,
      );
    }
  }

  if (t.waterMl !== null) {
    if (t.waterMl < 250 || t.waterMl > 10000) {
      block("WATER_IMPLAUSIBLE", "waterMl", "Water must be between 250 ml and 10,000 ml per day.");
    } else if (t.waterMl > 5000) {
      warn(
        "WATER_VERY_HIGH",
        "waterMl",
        "Drinking over 5 litres a day can be harmful unless you're very active or advised to.",
      );
    } else if (t.waterMl < 1000) {
      warn("WATER_VERY_LOW", "waterMl", "Under 1 litre of drinks a day is low for most adults.");
    }
  }

  if (t.sleepHours !== null) {
    if (t.sleepHours < 2 || t.sleepHours > 16) {
      block("SLEEP_IMPLAUSIBLE", "sleepHours", "Sleep must be between 2 and 16 hours.");
    } else if (t.sleepHours < 6) {
      warn("SLEEP_LOW", "sleepHours", "Most adults need at least 7 hours of sleep.");
    }
  }

  if (ctx.age !== null && ctx.age < 18 && Object.values(t).some((v) => v !== null)) {
    warn(
      "UNDER_18",
      "caloriesKcal",
      "Teenagers are still growing. Please set nutrition targets with a parent, doctor or registered dietitian.",
    );
  }

  return issues;
}
