/**
 * Body measurement unit conversions. Everything is stored metric; imperial is
 * for input and display only.
 */
const LB_PER_KG = 2.2046226218;
const CM_PER_INCH = 2.54;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const cmToIn = (cm: number) => cm / CM_PER_INCH;
export const inToCm = (inches: number) => inches * CM_PER_INCH;

export function ftInToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches);
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cmToIn(cm));
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Body-mass index. Returns null when either input is missing. */
export function bmi(weightKg: number | null, heightCm: number | null): number | null {
  if (weightKg === null || heightCm === null || heightCm <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function formatWeight(kg: number, system: "METRIC" | "IMPERIAL"): string {
  return system === "IMPERIAL" ? `${round(kgToLb(kg))} lb` : `${round(kg)} kg`;
}

export function formatHeight(cm: number, system: "METRIC" | "IMPERIAL"): string {
  if (system === "IMPERIAL") {
    const { feet, inches } = cmToFtIn(cm);
    return `${feet}′ ${inches}″`;
  }
  return `${round(cm)} cm`;
}

export function formatLength(cm: number, system: "METRIC" | "IMPERIAL"): string {
  return system === "IMPERIAL" ? `${round(cmToIn(cm))} in` : `${round(cm)} cm`;
}
