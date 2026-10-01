/**
 * Curated home-style dishes that USDA SR Legacy doesn't cover.
 *
 * Nutrition is NOT typed in: it is computed by the recipe engine from the USDA
 * ingredients below (raw weights for one batch), divided by the batch's cooked
 * weight. Recipes vary from kitchen to kitchen, so every dish is marked as an
 * estimate and its allergen status as unverified.
 *
 * Ingredient ids are USDA FoodData Central fdcIds (SR Legacy 2018-04).
 */
export type DishIngredient = { fdcId: string; grams: number; role?: "COOKING_FAT"; note?: string };
export type DishPortion = { unit: string; amount: number; gramWeight: number; label: string };

export type DishDefinition = {
  slug: string;
  name: string;
  aliases: string[];
  ingredients: DishIngredient[];
  /** Approximate cooked weight of the whole batch (water added in cooking counts). */
  cookedWeightG: number;
  portions: DishPortion[];
  note?: string;
};

// Common USDA ingredients
const RICE_RAW = "168877";
const RICE_COOKED = "168878";
const URAD = "174259";
const TOOR = "172436";
const MOONG = "174256";
const CHICKPEAS_COOKED = "173757";
const KIDNEY_COOKED = "175194";
const WHEAT_FLOUR = "168893";
const SEMOLINA = "169715";
const OIL = "171017";
const GHEE = "173412";
const ONION = "170000";
const TOMATO = "170457";
const POTATO = "170026";
const CARROT = "170393";
const PEAS = "170419";
const YOGURT = "171284";
const CHICKEN_RAW = "171077";
const EGG = "171287";
const GINGER = "169231";
const GARLIC = "169230";
const GREEN_CHILI = "170497";
const TAMARIND = "167763";
const TURMERIC = "172231";
const CUMIN = "170923";
const CHILI_POWDER = "171319";
const SALT = "173468";
const COCONUT = "170169";
const MILK = "171265";
const SUGAR = "169655";

const bowlPortions = (extra: DishPortion[] = []): DishPortion[] => [
  { unit: "katori", amount: 1, gramWeight: 150, label: "1 katori (small bowl, ~150 g)" },
  { unit: "bowl", amount: 1, gramWeight: 250, label: "1 bowl (~250 g)" },
  { unit: "cup", amount: 1, gramWeight: 240, label: "1 cup (~240 g)" },
  { unit: "serving", amount: 1, gramWeight: 200, label: "1 serving (~200 g)" },
  ...extra,
];

export const DISHES: DishDefinition[] = [
  {
    slug: "plain-dosa",
    name: "Dosa, plain (home-style)",
    aliases: ["dosa", "dosai", "plain dosa", "sada dosa"],
    ingredients: [
      { fdcId: RICE_RAW, grams: 150 },
      { fdcId: URAD, grams: 50 },
      { fdcId: SALT, grams: 3 },
      { fdcId: OIL, grams: 24, role: "COOKING_FAT", note: "about 3 g (⅔ tsp) per dosa" },
    ],
    cookedWeightG: 440,
    portions: [
      { unit: "piece", amount: 1, gramWeight: 55, label: "1 dosa (~55 g)" },
      { unit: "medium", amount: 1, gramWeight: 55, label: "1 medium dosa (~55 g)" },
      { unit: "large", amount: 1, gramWeight: 80, label: "1 large dosa (~80 g)" },
    ],
    note: "Batch makes about 8 dosas.",
  },
  {
    slug: "idli",
    name: "Idli (home-style)",
    aliases: ["idli", "idly", "idlis"],
    ingredients: [
      { fdcId: RICE_RAW, grams: 150 },
      { fdcId: URAD, grams: 50 },
      { fdcId: SALT, grams: 3 },
    ],
    cookedWeightG: 480,
    portions: [{ unit: "piece", amount: 1, gramWeight: 40, label: "1 idli (~40 g)" }],
    note: "Batch makes about 12 idlis.",
  },
  {
    slug: "sambar",
    name: "Sambar (home-style)",
    aliases: ["sambar", "sambhar"],
    ingredients: [
      { fdcId: TOOR, grams: 75 },
      { fdcId: ONION, grams: 60 },
      { fdcId: TOMATO, grams: 100 },
      { fdcId: CARROT, grams: 60 },
      { fdcId: TAMARIND, grams: 15 },
      { fdcId: TURMERIC, grams: 1 },
      { fdcId: CHILI_POWDER, grams: 3 },
      { fdcId: SALT, grams: 6 },
      { fdcId: OIL, grams: 10, role: "COOKING_FAT" },
    ],
    cookedWeightG: 900,
    portions: bowlPortions([{ unit: "ladle", amount: 1, gramWeight: 60, label: "1 ladle (~60 g)" }]),
    note: "Sambar powder varies by household and isn't counted separately.",
  },
  {
    slug: "dal-tadka",
    name: "Dal tadka, toor dal (home-style)",
    aliases: ["dal", "daal", "dal tadka", "dal fry", "toor dal tadka", "arhar dal"],
    ingredients: [
      { fdcId: TOOR, grams: 100 },
      { fdcId: ONION, grams: 50 },
      { fdcId: TOMATO, grams: 80 },
      { fdcId: GARLIC, grams: 6 },
      { fdcId: GINGER, grams: 5 },
      { fdcId: CUMIN, grams: 2 },
      { fdcId: TURMERIC, grams: 1 },
      { fdcId: CHILI_POWDER, grams: 2 },
      { fdcId: SALT, grams: 6 },
      { fdcId: GHEE, grams: 10, role: "COOKING_FAT" },
      { fdcId: OIL, grams: 5, role: "COOKING_FAT" },
    ],
    cookedWeightG: 700,
    portions: bowlPortions(),
  },
  {
    slug: "moong-dal",
    name: "Moong dal (home-style)",
    aliases: ["moong dal", "mung dal", "yellow dal"],
    ingredients: [
      { fdcId: MOONG, grams: 100 },
      { fdcId: ONION, grams: 40 },
      { fdcId: TOMATO, grams: 60 },
      { fdcId: CUMIN, grams: 2 },
      { fdcId: TURMERIC, grams: 1 },
      { fdcId: SALT, grams: 5 },
      { fdcId: GHEE, grams: 8, role: "COOKING_FAT" },
    ],
    cookedWeightG: 650,
    portions: bowlPortions(),
  },
  {
    slug: "chana-masala",
    name: "Chana masala (home-style)",
    aliases: ["chana masala", "chole", "chickpea curry"],
    ingredients: [
      { fdcId: CHICKPEAS_COOKED, grams: 400 },
      { fdcId: ONION, grams: 150 },
      { fdcId: TOMATO, grams: 200 },
      { fdcId: GINGER, grams: 8 },
      { fdcId: GARLIC, grams: 8 },
      { fdcId: CHILI_POWDER, grams: 3 },
      { fdcId: CUMIN, grams: 2 },
      { fdcId: SALT, grams: 6 },
      { fdcId: OIL, grams: 15, role: "COOKING_FAT" },
    ],
    cookedWeightG: 750,
    portions: bowlPortions(),
  },
  {
    slug: "rajma",
    name: "Rajma (kidney bean curry, home-style)",
    aliases: ["rajma", "rajma masala", "kidney bean curry"],
    ingredients: [
      { fdcId: KIDNEY_COOKED, grams: 400 },
      { fdcId: ONION, grams: 150 },
      { fdcId: TOMATO, grams: 200 },
      { fdcId: GINGER, grams: 8 },
      { fdcId: GARLIC, grams: 8 },
      { fdcId: CHILI_POWDER, grams: 3 },
      { fdcId: CUMIN, grams: 2 },
      { fdcId: SALT, grams: 6 },
      { fdcId: OIL, grams: 15, role: "COOKING_FAT" },
    ],
    cookedWeightG: 750,
    portions: bowlPortions(),
  },
  {
    slug: "aloo-sabzi",
    name: "Aloo sabzi (potato curry, home-style)",
    aliases: ["aloo sabzi", "aloo sabji", "potato curry", "aloo"],
    ingredients: [
      { fdcId: POTATO, grams: 500 },
      { fdcId: ONION, grams: 80 },
      { fdcId: TOMATO, grams: 100 },
      { fdcId: CUMIN, grams: 2 },
      { fdcId: TURMERIC, grams: 1 },
      { fdcId: CHILI_POWDER, grams: 2 },
      { fdcId: SALT, grams: 6 },
      { fdcId: OIL, grams: 20, role: "COOKING_FAT" },
    ],
    cookedWeightG: 620,
    portions: bowlPortions(),
  },
  {
    slug: "vegetable-upma",
    name: "Upma, vegetable (home-style)",
    aliases: ["upma", "rava upma", "sooji upma"],
    ingredients: [
      { fdcId: SEMOLINA, grams: 100 },
      { fdcId: ONION, grams: 50 },
      { fdcId: CARROT, grams: 40 },
      { fdcId: PEAS, grams: 40 },
      { fdcId: GREEN_CHILI, grams: 5 },
      { fdcId: SALT, grams: 3 },
      { fdcId: OIL, grams: 12, role: "COOKING_FAT" },
    ],
    cookedWeightG: 450,
    portions: bowlPortions(),
  },
  {
    slug: "chapati",
    name: "Chapati / roti, plain (home-style)",
    aliases: ["chapati", "chapathi", "roti", "phulka"],
    ingredients: [
      { fdcId: WHEAT_FLOUR, grams: 300 },
      { fdcId: SALT, grams: 3 },
    ],
    cookedWeightG: 400,
    portions: [
      { unit: "piece", amount: 1, gramWeight: 40, label: "1 chapati (~40 g)" },
      { unit: "medium", amount: 1, gramWeight: 40, label: "1 medium chapati (~40 g)" },
      { unit: "small", amount: 1, gramWeight: 30, label: "1 small chapati (~30 g)" },
      { unit: "large", amount: 1, gramWeight: 55, label: "1 large chapati (~55 g)" },
    ],
    note: "No ghee or oil; add it separately if you use some.",
  },
  {
    slug: "plain-paratha",
    name: "Paratha, plain (home-style)",
    aliases: ["paratha", "parantha", "plain paratha"],
    ingredients: [
      { fdcId: WHEAT_FLOUR, grams: 300 },
      { fdcId: SALT, grams: 4 },
      { fdcId: OIL, grams: 42, role: "COOKING_FAT", note: "about 7 g (1½ tsp) per paratha" },
    ],
    cookedWeightG: 450,
    portions: [{ unit: "piece", amount: 1, gramWeight: 75, label: "1 paratha (~75 g)" }],
    note: "Batch makes about 6 parathas.",
  },
  {
    slug: "jeera-rice",
    name: "Jeera rice (home-style)",
    aliases: ["jeera rice", "cumin rice"],
    ingredients: [
      { fdcId: RICE_COOKED, grams: 400 },
      { fdcId: CUMIN, grams: 3 },
      { fdcId: SALT, grams: 3 },
      { fdcId: GHEE, grams: 10, role: "COOKING_FAT" },
    ],
    cookedWeightG: 416,
    portions: [
      { unit: "cup", amount: 1, gramWeight: 160, label: "1 cup (~160 g)" },
      { unit: "katori", amount: 1, gramWeight: 120, label: "1 katori (~120 g)" },
      { unit: "bowl", amount: 1, gramWeight: 200, label: "1 bowl (~200 g)" },
    ],
  },
  {
    slug: "vegetable-khichdi",
    name: "Khichdi, vegetable (home-style)",
    aliases: ["khichdi", "khichri", "kichdi"],
    ingredients: [
      { fdcId: RICE_RAW, grams: 100 },
      { fdcId: MOONG, grams: 60 },
      { fdcId: CARROT, grams: 40 },
      { fdcId: PEAS, grams: 40 },
      { fdcId: TURMERIC, grams: 1 },
      { fdcId: CUMIN, grams: 2 },
      { fdcId: SALT, grams: 5 },
      { fdcId: GHEE, grams: 10, role: "COOKING_FAT" },
    ],
    cookedWeightG: 800,
    portions: bowlPortions(),
  },
  {
    slug: "curd-rice",
    name: "Curd rice (home-style)",
    aliases: ["curd rice", "thayir sadam", "dahi chawal"],
    ingredients: [
      { fdcId: RICE_COOKED, grams: 200 },
      { fdcId: YOGURT, grams: 150 },
      { fdcId: SALT, grams: 2 },
      { fdcId: OIL, grams: 3, role: "COOKING_FAT" },
    ],
    cookedWeightG: 355,
    portions: bowlPortions(),
  },
  {
    slug: "chicken-curry",
    name: "Chicken curry (home-style)",
    aliases: ["chicken curry", "chicken masala"],
    ingredients: [
      { fdcId: CHICKEN_RAW, grams: 500 },
      { fdcId: ONION, grams: 200 },
      { fdcId: TOMATO, grams: 200 },
      { fdcId: YOGURT, grams: 80 },
      { fdcId: GINGER, grams: 10 },
      { fdcId: GARLIC, grams: 10 },
      { fdcId: CHILI_POWDER, grams: 4 },
      { fdcId: TURMERIC, grams: 2 },
      { fdcId: SALT, grams: 7 },
      { fdcId: OIL, grams: 20, role: "COOKING_FAT" },
    ],
    cookedWeightG: 950,
    portions: bowlPortions(),
    note: "Made with boneless chicken breast.",
  },
  {
    slug: "egg-bhurji",
    name: "Egg bhurji (home-style)",
    aliases: ["egg bhurji", "anda bhurji", "masala scrambled eggs"],
    ingredients: [
      { fdcId: EGG, grams: 100, note: "2 large eggs" },
      { fdcId: ONION, grams: 30 },
      { fdcId: TOMATO, grams: 30 },
      { fdcId: GREEN_CHILI, grams: 3 },
      { fdcId: SALT, grams: 1 },
      { fdcId: OIL, grams: 5, role: "COOKING_FAT" },
    ],
    cookedWeightG: 150,
    portions: [{ unit: "serving", amount: 1, gramWeight: 150, label: "1 serving (2 eggs, ~150 g)" }],
  },
  {
    slug: "coconut-chutney",
    name: "Coconut chutney (home-style)",
    aliases: ["coconut chutney", "chutney"],
    ingredients: [
      { fdcId: COCONUT, grams: 100 },
      { fdcId: GREEN_CHILI, grams: 5 },
      { fdcId: SALT, grams: 2 },
      { fdcId: OIL, grams: 3, role: "COOKING_FAT" },
    ],
    cookedWeightG: 220,
    portions: [
      { unit: "tbsp", amount: 1, gramWeight: 15, label: "1 tbsp (~15 g)" },
      { unit: "serving", amount: 1, gramWeight: 30, label: "1 serving (2 tbsp, ~30 g)" },
    ],
    note: "Roasted chana dal varies by recipe and isn't counted.",
  },
  {
    slug: "masala-chai",
    name: "Masala chai with milk and sugar (home-style)",
    aliases: ["chai", "masala chai", "tea with milk", "milk tea"],
    ingredients: [
      { fdcId: MILK, grams: 100 },
      { fdcId: SUGAR, grams: 8 },
    ],
    cookedWeightG: 180,
    portions: [
      { unit: "cup", amount: 1, gramWeight: 150, label: "1 cup (~150 ml)" },
      { unit: "glass", amount: 1, gramWeight: 200, label: "1 glass (~200 ml)" },
    ],
    note: "Tea leaves and spices add negligible calories and aren't counted.",
  },
];
