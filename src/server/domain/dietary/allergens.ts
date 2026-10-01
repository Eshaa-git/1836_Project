/**
 * Allergen taxonomy. Codes are stable identifiers stored on DietaryRestriction
 * rows and (from Phase 3) on foods. Covers the major allergens recognised by
 * US (FALCPA + sesame) and EU/UK labelling rules.
 *
 * `includes` lists what the allergen covers so users can see, for example,
 * that "tree nuts" includes cashews — and that peanuts are separate.
 */
export type AllergenCode =
  | "peanut"
  | "tree_nut"
  | "milk"
  | "egg"
  | "wheat"
  | "gluten"
  | "soy"
  | "fish"
  | "crustacean"
  | "mollusc"
  | "sesame"
  | "mustard"
  | "celery"
  | "lupin"
  | "sulphite";

export type Allergen = {
  code: AllergenCode;
  label: string;
  includes: string[];
  /** Extra words users commonly type for this allergen (for matching free text). */
  synonyms: string[];
};

export const ALLERGENS: readonly Allergen[] = [
  {
    code: "peanut",
    label: "Peanuts",
    includes: ["peanuts", "peanut butter", "groundnut oil (unrefined)"],
    synonyms: ["peanut", "groundnut", "monkey nut"],
  },
  {
    code: "tree_nut",
    label: "Tree nuts",
    includes: ["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "brazil nut", "macadamia"],
    synonyms: ["nut", "nuts", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut"],
  },
  {
    code: "milk",
    label: "Milk",
    includes: ["milk", "cheese", "butter", "ghee", "yogurt", "paneer", "cream", "whey", "casein"],
    synonyms: ["dairy", "milk", "lactose", "cheese", "paneer", "curd", "yogurt", "whey", "casein"],
  },
  { code: "egg", label: "Eggs", includes: ["eggs", "mayonnaise", "meringue"], synonyms: ["egg", "eggs"] },
  {
    code: "wheat",
    label: "Wheat",
    includes: ["wheat flour", "atta", "maida", "semolina (sooji/rava)", "bread", "pasta"],
    synonyms: ["wheat", "atta", "maida", "semolina", "sooji", "rava"],
  },
  {
    code: "gluten",
    label: "Gluten (coeliac)",
    includes: ["wheat", "barley", "rye", "most oats unless certified gluten-free"],
    synonyms: ["gluten", "coeliac", "celiac", "barley", "rye"],
  },
  {
    code: "soy",
    label: "Soy",
    includes: ["soybeans", "tofu", "soy sauce", "edamame"],
    synonyms: ["soy", "soya", "tofu"],
  },
  {
    code: "fish",
    label: "Fish",
    includes: ["salmon", "tuna", "cod", "anchovy", "fish sauce"],
    synonyms: ["fish"],
  },
  {
    code: "crustacean",
    label: "Crustacean shellfish",
    includes: ["shrimp/prawns", "crab", "lobster"],
    synonyms: ["shellfish", "shrimp", "prawn", "crab", "lobster"],
  },
  {
    code: "mollusc",
    label: "Molluscs",
    includes: ["clams", "mussels", "oysters", "squid", "octopus"],
    synonyms: ["mollusc", "mollusk", "clam", "mussel", "oyster", "squid"],
  },
  {
    code: "sesame",
    label: "Sesame",
    includes: ["sesame seeds", "tahini", "gingelly oil"],
    synonyms: ["sesame", "til", "tahini"],
  },
  {
    code: "mustard",
    label: "Mustard",
    includes: ["mustard seeds", "mustard oil", "mustard sauce"],
    synonyms: ["mustard"],
  },
  { code: "celery", label: "Celery", includes: ["celery", "celeriac"], synonyms: ["celery", "celeriac"] },
  { code: "lupin", label: "Lupin", includes: ["lupin flour"], synonyms: ["lupin", "lupine"] },
  {
    code: "sulphite",
    label: "Sulphites",
    includes: ["some dried fruit", "wine", "some pickles"],
    synonyms: ["sulphite", "sulfite"],
  },
] as const;

const byCode = new Map(ALLERGENS.map((a) => [a.code, a]));

export function isAllergenCode(value: string): value is AllergenCode {
  return byCode.has(value as AllergenCode);
}

export function getAllergen(code: AllergenCode): Allergen {
  return byCode.get(code)!;
}

/**
 * Best-effort mapping from free text ("cashews", "dairy") to allergen codes.
 * Used to suggest a code when a user types an allergy; the user confirms it.
 */
export function suggestAllergenCodes(text: string): AllergenCode[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  const matchesWord = (synonym: string) =>
    words.some((w) => w === synonym || w === `${synonym}s` || w === `${synonym}es`);
  return ALLERGENS.filter((a) => a.synonyms.some(matchesWord)).map((a) => a.code);
}
