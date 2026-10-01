import { describe, expect, it } from "vitest";
import { fromMinutes, suggestMealTimes } from "./meal-times";

describe("suggestMealTimes", () => {
  it("spreads three meals across a typical day", () => {
    expect(suggestMealTimes(3, "07:00", "23:00")).toEqual([
      { label: "Breakfast", time: "08:00" },
      { label: "Lunch", time: "14:00" },
      { label: "Dinner", time: "20:00" },
    ]);
  });

  it("labels snacks for four and five meals", () => {
    expect(suggestMealTimes(4, "06:30", "22:30").map((m) => m.label)).toEqual([
      "Breakfast",
      "Lunch",
      "Snack",
      "Dinner",
    ]);
    expect(suggestMealTimes(5).map((m) => m.label)).toEqual([
      "Breakfast",
      "Snack",
      "Lunch",
      "Snack",
      "Dinner",
    ]);
  });

  it("handles bedtimes after midnight (e.g. shift work)", () => {
    expect(suggestMealTimes(3, "14:00", "04:00")).toEqual([
      { label: "Breakfast", time: "15:00" },
      { label: "Lunch", time: "20:00" },
      { label: "Dinner", time: "01:00" },
    ]);
  });

  it("rounds to 15 minutes and wraps past midnight", () => {
    expect(fromMinutes(487)).toBe("08:00");
    expect(fromMinutes(1500)).toBe("01:00");
  });
});
