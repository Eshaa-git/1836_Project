import { NUTRIENT_KEYS, type NutrientKey, type NutrientProfile } from "./nutrients";

/**
 * Nutrient arithmetic that never turns unknown into zero.
 *
 * A total is `complete` only when every item had a value for that nutrient.
 * When some items are unknown, `value` is the sum of the known items — a lower
 * bound — and the UI must show it as "at least …".
 */
export type NutrientTotal = { value: number | null; complete: boolean };
export type NutrientTotals = Record<NutrientKey, NutrientTotal>;

export type NutritionAmount = {
  totals: NutrientTotals;
  /** True when any part relies on an estimated portion, recipe or density. */
  isEstimate: boolean;
};

/** Nutrients in `grams` of a food, from its per-100 g profile. */
export function scaleProfile(per100g: NutrientProfile, grams: number): NutrientProfile {
  if (!(grams >= 0) || !Number.isFinite(grams)) throw new Error(`Invalid gram amount: ${grams}`);
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, per100g[k] === null ? null : (per100g[k] * grams) / 100]),
  ) as NutrientProfile;
}

/** Treats a profile as a single item's totals. */
export function profileToTotals(profile: NutrientProfile): NutrientTotals {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, { value: profile[k], complete: profile[k] !== null }]),
  ) as NutrientTotals;
}

/** Sums several items. An empty list has no known totals (not zero). */
export function sumNutrients(items: { amounts: NutrientProfile; isEstimate: boolean }[]): NutritionAmount {
  const totals = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => {
      const known = items.map((i) => i.amounts[k]).filter((v): v is number => v !== null);
      return [
        k,
        {
          value: known.length ? known.reduce((a, b) => a + b, 0) : null,
          complete: items.length > 0 && known.length === items.length,
        },
      ];
    }),
  ) as NutrientTotals;
  return { totals, isEstimate: items.some((i) => i.isEstimate) };
}

/** Divides totals (e.g. a whole recipe into servings). Completeness is preserved. */
export function divideTotals(totals: NutrientTotals, divisor: number): NutrientTotals {
  if (!(divisor > 0)) throw new Error(`Invalid divisor: ${divisor}`);
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [
      k,
      { value: totals[k].value === null ? null : totals[k].value / divisor, complete: totals[k].complete },
    ]),
  ) as NutrientTotals;
}

/**
 * Totals → a per-100 g profile. Incomplete totals become null: storing a
 * partial sum as a food's value would silently understate it.
 */
export function totalsToPer100g(totals: NutrientTotals, weightG: number): NutrientProfile {
  if (!(weightG > 0)) throw new Error(`Invalid weight: ${weightG}`);
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [
      k,
      totals[k].complete && totals[k].value !== null ? (totals[k].value * 100) / weightG : null,
    ]),
  ) as NutrientProfile;
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
