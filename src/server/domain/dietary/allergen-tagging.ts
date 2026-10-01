import type { AllergenCode } from "./allergens";

/**
 * Rule-based allergen tagging for foods from datasets that don't list
 * allergens (USDA). Rules deliberately err toward flagging.
 *
 * `assessment`:
 *  - ASSESSED: a single-ingredient food from a simple category; the name tells
 *    us what it is, so absent allergens can reasonably be treated as absent.
 *  - UNVERIFIED: a prepared/composite food (baked goods, sauces, restaurant
 *    meals…). Detected allergens are present, but others may be too — users
 *    with allergies must be warned.
 */
export type AllergenTags = {
  contains: AllergenCode[];
  assessment: "ASSESSED" | "UNVERIFIED";
};

/** Allergens that can never be inferred from a name (always treated as unknown). */
export const NEVER_INFERRED: readonly AllergenCode[] = ["sulphite"];

const SIMPLE_CATEGORIES = new Set([
  "Vegetables and Vegetable Products",
  "Fruits and Fruit Juices",
  "Beef Products",
  "Pork Products",
  "Poultry Products",
  "Lamb, Veal, and Game Products",
  "Finfish and Shellfish Products",
  "Legumes and Legume Products",
  "Nut and Seed Products",
  "Spices and Herbs",
  "Fats and Oils",
  "Dairy and Egg Products",
  "Cereal Grains and Pasta",
]);

/** Words that look like an allergen but aren't. Removed before matching. */
const FALSE_FRIENDS: [AllergenCode, RegExp][] = [
  ["milk", /\b(peanut|apple|cocoa|shea|nut|almond|cashew|sunflower|seed|sesame|soy|pumpkin) butter\b/g],
  ["milk", /\b(coconut|almond|soy|soya|rice|oat|cashew) (milk|cream|beverage)\b/g],
  ["milk", /\bcream of tartar\b|\bmilkfish\b|\bbutter ?beans?\b|\bbutternut\b|\bbutterbur\b|\bbutterhead\b/g],
  ["egg", /\beggplants?\b/g],
  [
    "wheat",
    /\b(rice|corn|potato|soy|chickpea|coconut|almond|tapioca|cassava|arrowroot|oat|sorghum|millet|teff|quinoa|amaranth|peanut|carob|lupin|rye|buckwheat) flour\b|\b(rice|corn) (noodles?|cakes?|crackers?|tortillas?)\b|\bcorn tortillas?\b|\brice paper\b|\bcornmeal\b|\bcake(s)? of soap\b/g,
  ],
  ["tree_nut", /\bbutternut squash\b|\bwater chestnuts?\b|\bnutmeg\b|\bcoconut\b/g],
];

const RULES: [AllergenCode, RegExp][] = [
  ["peanut", /\b(peanuts?|groundnuts?)\b/],
  [
    "tree_nut",
    /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|filberts?|brazil ?nuts?|macadamias?|pine ?nuts?|pinyon|pignolias?|chestnuts?|beechnuts?|butternuts|hickory ?nuts?|pralines?|marzipan|gianduja|nuts?, mixed|mixed nuts)\b/,
  ],
  [
    "milk",
    /\b(milk|cheese|butter|buttermilk|cream|creamer|yogh?urt|whey|casein|caseinate|ghee|paneer|curd|kefir|custard|lactose|ice cream|milk chocolate|butter oil)\b/,
  ],
  ["egg", /\b(eggs?|egg yolk|egg white|mayonnaise|meringue|eggnog)\b/],
  [
    "wheat",
    /\b(wheat|flour|breads?|pasta|spaghetti|macaroni|noodles?|couscous|bulgur|semolina|farina|seitan|crackers?|croissants?|bagels?|muffins?|pancakes?|waffles?|pretzels?|biscuits?|cookies?|cakes?|pies?|pastr(y|ies)|doughnuts?|naan|pita|tortillas?|croutons?|bread ?crumbs?|graham|spelt|durum|matzo|chapati|roti|paratha)\b/,
  ],
  ["soy", /\b(soy|soya|soybeans?|tofu|edamame|miso|tempeh|natto)\b/],
  ["crustacean", /\b(shrimps?|prawns?|crabs?|lobsters?|crayfish|crawfish|krill)\b/],
  [
    "mollusc",
    /\b(clams?|oysters?|mussels?|scallops?|squid|octopus|cuttlefish|snails?|escargot|abalone|whelks?|conch)\b/,
  ],
  ["fish", /\b(fish|anchov(y|ies)|worcestershire)\b/],
  ["sesame", /\b(sesame|tahini|halvah|halva)\b/],
  ["mustard", /\bmustard\b/],
  ["celery", /\b(celery|celeriac)\b/],
  ["lupin", /\b(lupins?|lupines?|lupini)\b/],
];

const GLUTEN_EXTRA = /\b(barley|rye|malt|malted|triticale)\b/;

export function tagAllergens(name: string, category: string | null): AllergenTags {
  const contains = new Set<AllergenCode>();
  const lower = name.toLowerCase();

  for (const [code, rule] of RULES) {
    let text = lower;
    for (const [fcode, friend] of FALSE_FRIENDS) if (fcode === code) text = text.replace(friend, " ");
    if (rule.test(text)) contains.add(code);
  }

  // Finfish category items are fish unless they're shellfish.
  if (
    category === "Finfish and Shellfish Products" &&
    !contains.has("crustacean") &&
    !contains.has("mollusc")
  ) {
    contains.add("fish");
  }
  if (contains.has("wheat") || GLUTEN_EXTRA.test(lower)) contains.add("gluten");

  return {
    contains: [...contains].sort(),
    assessment: category && SIMPLE_CATEGORIES.has(category) ? "ASSESSED" : "UNVERIFIED",
  };
}
