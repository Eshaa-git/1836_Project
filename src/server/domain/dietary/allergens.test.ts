import { describe, expect, it } from "vitest";
import { ALLERGENS, isAllergenCode, suggestAllergenCodes } from "./allergens";

describe("allergen taxonomy", () => {
  it("has unique codes", () => {
    expect(new Set(ALLERGENS.map((a) => a.code)).size).toBe(ALLERGENS.length);
  });

  it("validates codes", () => {
    expect(isAllergenCode("peanut")).toBe(true);
    expect(isAllergenCode("nuts")).toBe(false);
  });

  it("keeps peanuts and tree nuts distinct", () => {
    expect(suggestAllergenCodes("peanuts")).toEqual(["peanut"]);
    expect(suggestAllergenCodes("cashews")).toEqual(["tree_nut"]);
    expect(suggestAllergenCodes("peanuts and tree nuts").sort()).toEqual(["peanut", "tree_nut"]);
  });

  it("maps common free-text words", () => {
    expect(suggestAllergenCodes("Dairy")).toEqual(["milk"]);
    expect(suggestAllergenCodes("prawns")).toEqual(["crustacean"]);
    expect(suggestAllergenCodes("paneer")).toEqual(["milk"]);
    expect(suggestAllergenCodes("sulphites")).toEqual(["sulphite"]);
    expect(suggestAllergenCodes("mushrooms")).toEqual([]);
  });
});
