import { describe, expect, it } from "vitest";
import { tagAllergens } from "./allergen-tagging";

const tags = (name: string, category: string | null = "Legumes and Legume Products") =>
  tagAllergens(name, category).contains;

describe("tagAllergens", () => {
  it("separates peanut butter (peanut) from butter (milk)", () => {
    expect(tags("Peanut butter, smooth style, without salt")).toEqual(["peanut"]);
    expect(tags("Butter, salted", "Dairy and Egg Products")).toEqual(["milk"]);
    expect(tags("Butter oil, anhydrous", "Dairy and Egg Products")).toEqual(["milk"]);
  });

  it("does not flag look-alike words", () => {
    expect(tags("Eggplant, raw", "Vegetables and Vegetable Products")).toEqual([]);
    expect(tags("Squash, winter, butternut, raw", "Vegetables and Vegetable Products")).toEqual([]);
    expect(tags("Nuts, coconut meat, raw", "Nut and Seed Products")).toEqual([]);
    expect(tags("Water chestnuts, chinese, raw", "Vegetables and Vegetable Products")).toEqual([]);
    expect(tags("Spices, nutmeg, ground", "Spices and Herbs")).toEqual([]);
    expect(tags("Rice flour, white", "Cereal Grains and Pasta")).toEqual([]);
    expect(tags("Beverages, almond milk, unsweetened", "Beverages")).toEqual(["tree_nut"]);
  });

  it("recognises common allergens", () => {
    expect(tags("Egg, whole, raw, fresh", "Dairy and Egg Products")).toEqual(["egg"]);
    expect(tags("Nuts, almonds", "Nut and Seed Products")).toEqual(["tree_nut"]);
    expect(tags("Nuts, butternuts, dried", "Nut and Seed Products")).toEqual(["tree_nut"]);
    expect(tags("Crustaceans, shrimp, raw", "Finfish and Shellfish Products")).toEqual(["crustacean"]);
    expect(tags("Fish, salmon, Atlantic, raw", "Finfish and Shellfish Products")).toEqual(["fish"]);
    expect(tags("Mollusks, squid, raw", "Finfish and Shellfish Products")).toEqual(["mollusc"]);
    expect(tags("Seeds, sesame butter, tahini", "Nut and Seed Products")).toEqual(["sesame"]);
    expect(tags("Tofu, firm, prepared with calcium sulfate")).toEqual(["soy"]);
  });

  it("adds gluten for wheat and other gluten grains", () => {
    expect(tags("Bread, naan, plain, commercially prepared", "Baked Products")).toEqual(["gluten", "wheat"]);
    expect(tags("Barley, pearled, cooked", "Cereal Grains and Pasta")).toEqual(["gluten"]);
  });

  it("marks composite foods as unverified", () => {
    expect(tagAllergens("Fast foods, cheeseburger", "Fast Foods").assessment).toBe("UNVERIFIED");
    expect(tagAllergens("Apples, raw, with skin", "Fruits and Fruit Juices")).toEqual({
      contains: [],
      assessment: "ASSESSED",
    });
    expect(tagAllergens("Anything", null).assessment).toBe("UNVERIFIED");
  });
});
