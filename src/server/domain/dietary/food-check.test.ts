import { describe, expect, it } from "vitest";
import { checkFood, isUnsafe, nameMentions, type FoodFacts, type UserRestriction } from "./food-check";

const peanutButter: FoodFacts = {
  name: "Peanut butter, smooth style",
  category: "Legumes and Legume Products",
  contains: ["peanut"],
  assessment: "ASSESSED",
};
const apple: FoodFacts = {
  name: "Apples, raw, with skin",
  category: "Fruits and Fruit Juices",
  contains: [],
  assessment: "ASSESSED",
};
const cookie: FoodFacts = {
  name: "Cookies, chocolate chip",
  category: "Baked Products",
  contains: ["gluten", "wheat"],
  assessment: "UNVERIFIED",
};
const yogurt: FoodFacts = {
  name: "Yogurt, plain, whole milk",
  category: "Dairy and Egg Products",
  contains: ["milk"],
  assessment: "ASSESSED",
};
const chicken: FoodFacts = {
  name: "Chicken breast, roasted",
  category: "Poultry Products",
  contains: [],
  assessment: "ASSESSED",
};
const egg: FoodFacts = {
  name: "Egg, whole, raw",
  category: "Dairy and Egg Products",
  contains: ["egg"],
  assessment: "ASSESSED",
};

const allergy = (label: string, allergenCode: string | null = null): UserRestriction => ({
  kind: "ALLERGY",
  label,
  allergenCode,
});

describe("checkFood — allergies", () => {
  it("flags a known allergen as danger (never recommend)", () => {
    const findings = checkFood(peanutButter, [allergy("Peanuts", "peanut")]);
    expect(findings).toEqual([
      expect.objectContaining({ level: "danger", message: "Contains peanuts — you're allergic." }),
    ]);
    expect(isUnsafe(findings)).toBe(true);
  });

  it("finds no issue for a simple food without the allergen", () => {
    expect(checkFood(apple, [allergy("Peanuts", "peanut")])).toEqual([]);
  });

  it("warns when allergen info can't be confirmed for prepared foods", () => {
    const findings = checkFood(cookie, [allergy("Peanuts", "peanut")]);
    expect(findings).toEqual([expect.objectContaining({ level: "warning" })]);
    expect(isUnsafe(findings)).toBe(false);
  });

  it("matches free-text allergies by name and warns when it can't tell", () => {
    const kiwi = allergy("Kiwi");
    expect(checkFood({ ...apple, name: "Kiwifruit, green, raw" }, [kiwi])).toEqual([
      expect.objectContaining({ level: "warning" }),
    ]);
    expect(checkFood({ ...apple, name: "Kiwi, raw" }, [kiwi])[0]!.level).toBe("danger");
  });

  it("treats may-contain as danger for allergies", () => {
    expect(
      checkFood({ ...apple, mayContain: ["tree_nut"] }, [allergy("Tree nuts", "tree_nut")])[0]!.level,
    ).toBe("danger");
  });

  it("never assumes sulphites are absent", () => {
    expect(checkFood(apple, [allergy("Sulphites", "sulphite")])[0]!.level).toBe("warning");
  });
});

describe("checkFood — other categories are not equivalent to allergies", () => {
  it("intolerance is a warning, not danger", () => {
    const findings = checkFood(yogurt, [{ kind: "INTOLERANCE", label: "Lactose", allergenCode: "milk" }]);
    expect(findings).toEqual([
      expect.objectContaining({ level: "warning", message: "Contains milk, which you're intolerant to." }),
    ]);
    expect(isUnsafe(findings)).toBe(false);
  });

  it("disliked foods are a caution", () => {
    expect(
      checkFood({ ...apple, name: "Mushrooms, white, raw" }, [
        { kind: "AVOID", label: "Mushrooms", allergenCode: null },
      ]),
    ).toEqual([expect.objectContaining({ level: "caution" })]);
  });

  it("handles 'no X' rules and unverifiable religious rules", () => {
    const noBeef: UserRestriction = { kind: "OTHER", label: "No beef", allergenCode: null };
    expect(
      checkFood({ ...chicken, name: "Beef, ground, cooked", category: "Beef Products" }, [noBeef])[0]!.level,
    ).toBe("caution");
    expect(checkFood(chicken, [noBeef])).toEqual([]);
    const halal: UserRestriction = { kind: "OTHER", label: "Halal", allergenCode: null };
    expect(checkFood(chicken, [halal])[0]!.message).toMatch(/can't confirm this is halal/);
    expect(checkFood(apple, [halal])).toEqual([]);
  });
});

describe("checkFood — diet type", () => {
  it("flags meat for vegetarians and egg for strict vegetarians, not eggetarians", () => {
    expect(checkFood(chicken, [], "VEGETARIAN")[0]!.message).toMatch(/meat/);
    expect(checkFood(egg, [], "VEGETARIAN")).toHaveLength(1);
    expect(checkFood(egg, [], "EGGETARIAN")).toEqual([]);
  });

  it("flags dairy for vegans and meat for pescatarians", () => {
    expect(checkFood(yogurt, [], "VEGAN")[0]!.message).toMatch(/dairy/);
    expect(checkFood(chicken, [], "PESCATARIAN")).toHaveLength(1);
    expect(
      checkFood(
        { ...chicken, name: "Fish, salmon", category: "Finfish and Shellfish Products", contains: ["fish"] },
        [],
        "PESCATARIAN",
      ),
    ).toEqual([]);
  });
});

describe("nameMentions", () => {
  it("matches whole words with plural tolerance", () => {
    expect(nameMentions("Peanut butter", "Peanuts")).toBe(true);
    expect(nameMentions("Pineapple, raw", "Apple")).toBe(false);
  });
});
