/**
 * Converts what people say ("2 eggs", "half a cup of yogurt", "1 bowl of dal")
 * into grams for a specific food, deterministically.
 *
 * Order of preference: exact mass → the food's own portion for that unit →
 * the food's own density (from its volume portions) → clearly-labelled
 * estimates (household vessels, assumed sizes, water-like density for drinks)
 * → otherwise ask for clarification. Nothing is guessed silently.
 */

export type FoodPortion = {
  /** Normalized unit, e.g. "cup", "tbsp", "medium", "slice", "piece", "bowl". */
  unit: string;
  /** How many units the gram weight refers to (e.g. 0.5 cup). */
  amount: number;
  gramWeight: number;
  /** Human label, e.g. "1 medium (3\" dia)". */
  label: string;
  isEstimate?: boolean;
};

export type FoodForUnits = {
  name: string;
  category: string | null;
  portions: FoodPortion[];
};

export type GramsResult =
  | {
      ok: true;
      grams: number;
      isEstimate: boolean;
      method: "mass" | "portion" | "density" | "assumed";
      /** Explains any assumption, e.g. "Assumed a medium one". */
      note?: string;
    }
  | {
      ok: false;
      reason: "needs_clarification";
      message: string;
      options: { label: string; unit: string; grams: number }[];
    };

const MASS_G: Record<string, number> = { g: 1, kg: 1000, mg: 0.001, oz: 28.349523125, lb: 453.59237 };
const VOLUME_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  fl_oz: 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
};
/** Household vessels: sizes vary, so any conversion through these is an estimate. */
const HOUSEHOLD_ML: Record<string, number> = { glass: 250, mug: 300, bowl: 250, katori: 150, ladle: 60 };
const SIZES = ["small", "medium", "large", "extra_large", "jumbo"] as const;

const SYNONYMS: Record<string, string> = {
  gram: "g",
  grams: "g",
  gm: "g",
  gms: "g",
  gr: "g",
  kilogram: "kg",
  kilograms: "kg",
  kgs: "kg",
  milligram: "mg",
  milligrams: "mg",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tsps: "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbs: "tbsp",
  tbl: "tbsp",
  tbsps: "tbsp",
  "fl oz": "fl_oz",
  "fluid ounce": "fl_oz",
  "fluid ounces": "fl_oz",
  cups: "cup",
  pints: "pint",
  quarts: "quart",
  pieces: "piece",
  pc: "piece",
  pcs: "piece",
  each: "piece",
  whole: "piece",
  nos: "piece",
  item: "piece",
  items: "piece",
  unit: "piece",
  units: "piece",
  slices: "slice",
  servings: "serving",
  portion: "serving",
  portions: "serving",
  bowls: "bowl",
  glasses: "glass",
  mugs: "mug",
  katoris: "katori",
  ladles: "ladle",
  med: "medium",
  sm: "small",
  big: "large",
  lg: "large",
  "extra large": "extra_large",
  "extra-large": "extra_large",
  xl: "extra_large",
};

/** Normalizes a unit word. Empty means "a whole one" (piece). Unknown words are singularized. */
export function normalizeUnit(raw: string | null | undefined): string {
  const text = (raw ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!text) return "piece";
  if (SYNONYMS[text]) return SYNONYMS[text];
  if (
    text in MASS_G ||
    text in VOLUME_ML ||
    text in HOUSEHOLD_ML ||
    (SIZES as readonly string[]).includes(text)
  ) {
    return text;
  }
  if (/ies$/.test(text)) return text.replace(/ies$/, "y");
  if (/(ss|us)$/.test(text)) return text; // "glass", "asparagus"
  if (/(s|x|z|ch|sh)es$/.test(text)) return text.replace(/es$/, "");
  return text.replace(/s$/, "");
}

export function unitKind(unit: string): "mass" | "volume" | "household" | "size" | "count" {
  if (unit in MASS_G) return "mass";
  if (unit in VOLUME_ML) return "volume";
  if (unit in HOUSEHOLD_ML) return "household";
  if ((SIZES as readonly string[]).includes(unit)) return "size";
  return "count";
}

const LIQUID_CATEGORIES = ["Beverages", "Soups, Sauces, and Gravies"];
const LIQUID_WORDS = /\b(milk|juice|water|tea|coffee|soup|broth|lassi|buttermilk|smoothie|drink|beverage)\b/i;

const gramsPerUnit = (p: FoodPortion) => p.gramWeight / p.amount;

function similar(values: number[]) {
  return values.length > 0 && Math.max(...values) / Math.min(...values) <= 1.15;
}

/** Grams per ml from the food's own volume portions, or null when unknown/inconsistent. */
export function densityOf(food: FoodForUnits): number | null {
  const densities = food.portions
    .filter((p) => unitKind(p.unit) === "volume")
    .map((p) => gramsPerUnit(p) / VOLUME_ML[p.unit]!);
  if (!similar(densities)) return null;
  return densities.reduce((a, b) => a + b, 0) / densities.length;
}

function optionsFor(food: FoodForUnits) {
  return food.portions.map((p) => ({ label: p.label, unit: p.unit, grams: round1(gramsPerUnit(p)) }));
}

function clarify(food: FoodForUnits, message: string): GramsResult {
  return { ok: false, reason: "needs_clarification", message, options: optionsFor(food) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function fromVolume(food: FoodForUnits, ml: number, forcedEstimate: boolean, note?: string): GramsResult {
  const density = densityOf(food);
  if (density !== null) {
    return { ok: true, grams: ml * density, isEstimate: forcedEstimate, method: "density", note };
  }
  const liquid = LIQUID_CATEGORIES.includes(food.category ?? "") || LIQUID_WORDS.test(food.name);
  if (liquid) {
    return {
      ok: true,
      grams: ml,
      isEstimate: true,
      method: "assumed",
      note: [note, "Assumed it weighs about the same as water"].filter(Boolean).join(". "),
    };
  }
  return clarify(
    food,
    `We don't know how much a measured volume of ${food.name} weighs. Can you give grams, or pick a portion?`,
  );
}

/**
 * Converts `quantity` of `unitText` of a food to grams.
 * `quantity` must be > 0 (parse text with `parseQuantity` first).
 */
export function resolveGrams(food: FoodForUnits, quantity: number, unitText?: string | null): GramsResult {
  if (!(quantity > 0) || !Number.isFinite(quantity)) throw new Error(`Invalid quantity: ${quantity}`);
  const unit = normalizeUnit(unitText);
  const kind = unitKind(unit);

  if (kind === "mass")
    return { ok: true, grams: quantity * MASS_G[unit]!, isEstimate: false, method: "mass" };

  // The food's own portion for this exact unit is the best source (e.g. "1 medium apple" = 182 g).
  const own = food.portions.filter((p) => p.unit === unit);
  if (own.length) {
    const weights = own.map(gramsPerUnit);
    if (!similar(weights)) {
      return {
        ok: false,
        reason: "needs_clarification",
        message: `“${unit}” of ${food.name} can mean different amounts. Which one?`,
        options: own.map((p) => ({ label: p.label, unit: p.unit, grams: round1(gramsPerUnit(p)) })),
      };
    }
    return {
      ok: true,
      grams: quantity * weights[0]!,
      isEstimate: own.some((p) => p.isEstimate),
      method: "portion",
    };
  }

  if (kind === "volume") return fromVolume(food, quantity * VOLUME_ML[unit]!, false);
  if (kind === "household") {
    return fromVolume(
      food,
      quantity * HOUSEHOLD_ML[unit]!,
      true,
      `A ${unit} was taken as about ${HOUSEHOLD_ML[unit]} ml`,
    );
  }

  const sizes = food.portions.filter((p) => unitKind(p.unit) === "size");
  if (kind === "size") {
    return clarify(
      food,
      sizes.length
        ? `We don't have a ${unit.replace("_", " ")} size for ${food.name}. Which is closest?`
        : `How much ${food.name} is that? Pick a portion or give grams.`,
    );
  }

  // Count units: "2 eggs", "1 apple", "3 pieces".
  if (unit === "piece") {
    const medium = sizes.find((p) => p.unit === "medium");
    if (medium) {
      return {
        ok: true,
        grams: quantity * gramsPerUnit(medium),
        isEstimate: true,
        method: "assumed",
        note: quantity === 1 ? "Assumed a medium one" : "Assumed medium ones",
      };
    }
    const countLike = food.portions.filter((p) => unitKind(p.unit) === "count" && p.unit !== "serving");
    if (countLike.length === 1) {
      return {
        ok: true,
        grams: quantity * gramsPerUnit(countLike[0]!),
        isEstimate: true,
        method: "assumed",
        note: `Assumed 1 = ${countLike[0]!.label}`,
      };
    }
  }

  return clarify(food, `How much ${food.name} is that? Pick a portion or give grams.`);
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
  couple: 2,
};
const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

/** Parses "2", "1.5", "1/2", "1 1/2", "1½", "half", "a", "two" → number; otherwise null. */
export function parseQuantity(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;
  if (t in WORD_NUMBERS) return WORD_NUMBERS[t]!;
  if (t === "half a" || t === "half an") return 0.5;

  const unicode = t.match(/^(\d+)?\s?([½¼¾⅓⅔])$/);
  if (unicode) return Number(unicode[1] ?? 0) + UNICODE_FRACTIONS[unicode[2]!]!;

  const mixed = t.match(/^(\d+) (\d+)\/(\d+)$/);
  if (mixed) return frac(Number(mixed[1]), Number(mixed[2]), Number(mixed[3]));

  const fraction = t.match(/^(\d+)\/(\d+)$/);
  if (fraction) return frac(0, Number(fraction[1]), Number(fraction[2]));

  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function frac(whole: number, num: number, den: number) {
  return den > 0 && num > 0 ? whole + num / den : null;
}
