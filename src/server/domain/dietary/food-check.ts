import { getAllergen, isAllergenCode, type AllergenCode } from "./allergens";
import { NEVER_INFERRED } from "./allergen-tagging";

/**
 * Deterministic check of one food against a user's restrictions and diet.
 *
 * Levels:
 *  - danger:  contains (or may contain) a recorded ALLERGEN — must never be recommended
 *  - warning: allergen status can't be confirmed, or an intolerance trigger, or diet conflict
 *  - caution: a food the user avoids or a rule we can't verify (e.g. halal)
 */
export type FoodFacts = {
  name: string;
  category: string | null;
  contains: AllergenCode[];
  mayContain?: AllergenCode[];
  assessment: "ASSESSED" | "UNVERIFIED";
};

export type UserRestriction = {
  kind: "ALLERGY" | "INTOLERANCE" | "AVOID" | "OTHER";
  label: string;
  allergenCode: string | null;
};

export type DietType = "OMNIVORE" | "VEGETARIAN" | "EGGETARIAN" | "VEGAN" | "PESCATARIAN" | "OTHER" | null;

export type FoodFinding = {
  level: "danger" | "warning" | "caution";
  source: UserRestriction["kind"] | "DIET";
  label: string;
  message: string;
};

const LEVEL_ORDER = { danger: 0, warning: 1, caution: 2 } as const;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((w) => w.replace(/(es|s)$/, ""));
}

/** True when every word of `label` appears in the food's name (plural-tolerant). */
export function nameMentions(foodName: string, label: string): boolean {
  const food = new Set(words(foodName));
  const wanted = words(label).filter((w) => !["no", "free", "without"].includes(w));
  return wanted.length > 0 && wanted.every((w) => food.has(w));
}

const MEAT_CATEGORIES = new Set([
  "Beef Products",
  "Pork Products",
  "Poultry Products",
  "Lamb, Veal, and Game Products",
  "Sausages and Luncheon Meats",
]);
const MEAT_WORDS =
  /\b(beef|pork|ham|bacon|chicken|turkey|lamb|mutton|goat|veal|duck|venison|sausage|salami|pepperoni|gelatin|lard)\b/i;
const FISH_WORDS =
  /\b(fish|salmon|tuna|cod|sardine|anchov|shrimp|prawn|crab|lobster|clam|oyster|squid|mussel)/i;
const ANIMAL_WORDS = /\b(honey|gelatin)\b/i;
const JAIN_ROOTS = /\b(onions?|garlic|potato(es)?|carrots?|beets?|radish(es)?|ginger|turnips?)\b/i;

function dietFindings(food: FoodFacts, diet: DietType): FoodFinding[] {
  if (!diet || diet === "OMNIVORE" || diet === "OTHER") return [];
  const meat = MEAT_CATEGORIES.has(food.category ?? "") || MEAT_WORDS.test(food.name);
  const seafood =
    food.category === "Finfish and Shellfish Products" ||
    food.contains.some((c) => c === "fish" || c === "crustacean" || c === "mollusc") ||
    FISH_WORDS.test(food.name);
  const egg = food.contains.includes("egg");
  const dairy = food.contains.includes("milk");

  const finding = (why: string): FoodFinding[] => [
    {
      level: "warning",
      source: "DIET",
      label: diet.toLowerCase(),
      message: `${why}, which doesn't fit your diet.`,
    },
  ];
  if (diet === "PESCATARIAN" && meat) return finding("Contains meat");
  if ((diet === "VEGETARIAN" || diet === "EGGETARIAN" || diet === "VEGAN") && (meat || seafood)) {
    return finding(meat ? "Contains meat" : "Contains fish or seafood");
  }
  if (diet === "VEGETARIAN" && egg) return finding("Contains egg");
  if (diet === "VEGAN" && (egg || dairy || ANIMAL_WORDS.test(food.name))) {
    return finding(egg ? "Contains egg" : dairy ? "Contains dairy" : "Contains an animal product");
  }
  return [];
}

export function checkFood(
  food: FoodFacts,
  restrictions: UserRestriction[],
  diet: DietType = null,
): FoodFinding[] {
  const findings: FoodFinding[] = [];
  const contains = new Set(food.contains);
  const mayContain = new Set(food.mayContain ?? []);

  for (const r of restrictions) {
    const code = r.allergenCode && isAllergenCode(r.allergenCode) ? r.allergenCode : null;
    const what = code ? getAllergen(code).label.toLowerCase() : r.label;

    if (r.kind === "ALLERGY") {
      if ((code && contains.has(code)) || nameMentions(food.name, r.label)) {
        findings.push({
          level: "danger",
          source: r.kind,
          label: r.label,
          message: `Contains ${what} — you're allergic.`,
        });
      } else if (code && mayContain.has(code)) {
        findings.push({
          level: "danger",
          source: r.kind,
          label: r.label,
          message: `May contain ${what} — you're allergic.`,
        });
      } else if (food.assessment === "UNVERIFIED" || !code || NEVER_INFERRED.includes(code)) {
        findings.push({
          level: "warning",
          source: r.kind,
          label: r.label,
          message: `We can't confirm this is free from ${what}. Check the ingredients before eating.`,
        });
      }
    } else if (r.kind === "INTOLERANCE") {
      if ((code && contains.has(code)) || nameMentions(food.name, r.label)) {
        findings.push({
          level: "warning",
          source: r.kind,
          label: r.label,
          message: `Contains ${what}, which you're intolerant to.`,
        });
      } else if (code && mayContain.has(code)) {
        findings.push({ level: "caution", source: r.kind, label: r.label, message: `May contain ${what}.` });
      }
    } else if (r.kind === "AVOID") {
      if (nameMentions(food.name, r.label)) {
        findings.push({
          level: "caution",
          source: r.kind,
          label: r.label,
          message: `You avoid ${r.label.toLowerCase()}.`,
        });
      }
    } else {
      findings.push(...otherRuleFindings(food, r));
    }
  }

  findings.push(...dietFindings(food, diet));
  return findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

function otherRuleFindings(food: FoodFacts, r: UserRestriction): FoodFinding[] {
  const label = r.label.toLowerCase();
  const meat = MEAT_CATEGORIES.has(food.category ?? "") || MEAT_WORDS.test(food.name);
  const caution = (message: string): FoodFinding[] => [
    { level: "caution", source: "OTHER", label: r.label, message },
  ];

  if (/\b(halal|kosher)\b/.test(label)) {
    return meat ? caution(`We can't confirm this is ${label}.`) : [];
  }
  if (/\bjain\b/.test(label)) {
    return JAIN_ROOTS.test(food.name) || meat ? caution("This may not fit a Jain diet.") : [];
  }
  const no = label.match(/^(no|without)\s+(.+)$/) ?? label.match(/^(.+)[- ]free$/);
  if (no) {
    const target = no[2] ?? no[1]!;
    return target.split(/\s+(?:or|and|,)\s+/).some((t) => nameMentions(food.name, t))
      ? caution(`You don't eat ${target}.`)
      : [];
  }
  return nameMentions(food.name, r.label) ? caution(`Conflicts with “${r.label}”.`) : [];
}

/** True if any finding means the food must not be recommended. */
export function isUnsafe(findings: FoodFinding[]): boolean {
  return findings.some((f) => f.level === "danger");
}
