import { describe, expect, it } from "vitest";
import { emptyProfile, type NutrientProfile } from "../nutrition/nutrients";
import { mealSlotsFor, summarizeDay, type DayInput, type LoggedItem } from "./day";

const p = (v: Partial<NutrientProfile>): NutrientProfile => ({ ...emptyProfile(), ...v });
const slots = mealSlotsFor({
  mealTimes: [
    { label: "Breakfast", time: "08:00" },
    { label: "Lunch", time: "13:00" },
    { label: "Snack", time: "16:30" },
    { label: "Dinner", time: "20:00" },
  ],
  mealsPerDay: 4,
  wakeTime: null,
  bedTime: null,
});
const item = (
  id: string,
  mealSlot: string,
  amounts: Partial<NutrientProfile>,
  isEstimate = false,
): LoggedItem => ({
  id,
  mealSlot,
  amounts: p(amounts),
  isEstimate,
});
const base = (over: Partial<DayInput> = {}): DayInput => ({
  date: "2026-10-01",
  now: { date: "2026-10-01", minutes: 18 * 60 }, // 6 pm
  slots,
  items: [],
  skipped: [],
  markedComplete: false,
  targets: { energyKcal: 2000, proteinG: 100 },
  ...over,
});

describe("mealSlotsFor", () => {
  it("numbers duplicate labels and sorts by time", () => {
    const s = mealSlotsFor({
      mealTimes: [
        { label: "Snack", time: "16:00" },
        { label: "Breakfast", time: "08:00" },
        { label: "Snack", time: "11:00" },
      ],
      mealsPerDay: null,
      wakeTime: null,
      bedTime: null,
    });
    expect(s.map((x) => x.key)).toEqual(["Breakfast", "Snack", "Snack 2"]);
  });

  it("defaults to three meals when the user hasn't set any", () => {
    expect(
      mealSlotsFor({ mealTimes: [], mealsPerDay: null, wakeTime: null, bedTime: null }).map((s) => s.label),
    ).toEqual(["Breakfast", "Lunch", "Dinner"]);
  });
});

describe("summarizeDay", () => {
  it("distinguishes logged, skipped, not logged and upcoming meals", () => {
    const day = summarizeDay(
      base({ items: [item("a", "Breakfast", { energyKcal: 400, proteinG: 20 })], skipped: ["Lunch"] }),
    );
    expect(day.slots.map((s) => [s.key, s.status])).toEqual([
      ["Breakfast", "LOGGED"],
      ["Lunch", "SKIPPED"],
      ["Snack", "NOT_LOGGED"], // 16:30 + 90 min grace = 18:00
      ["Dinner", "UPCOMING"],
    ]);
    expect(day.unloggedSlots).toEqual(["Snack"]);
    expect(day.completeness).toBe("PARTIAL");
  });

  it("gives a grace period before a meal counts as not logged", () => {
    const day = summarizeDay(base({ now: { date: "2026-10-01", minutes: 17 * 60 } }));
    expect(day.slots.find((s) => s.key === "Snack")!.status).toBe("UPCOMING");
  });

  it("never treats an unlogged day as zero calories", () => {
    const day = summarizeDay(base());
    expect(day.completeness).toBe("NONE");
    expect(day.totals.energyKcal.value).toBeNull();
    expect(day.remaining.energyKcal).toEqual({ status: "unknown" });
  });

  it("calls remaining an upper bound when meals are unlogged", () => {
    const day = summarizeDay(base({ items: [item("a", "Breakfast", { energyKcal: 400, proteinG: 20 })] }));
    expect(day.remaining.energyKcal).toEqual({ status: "at_most", value: 1600, over: false });
  });

  it("gives an exact remaining when the day is on track", () => {
    const day = summarizeDay(
      base({
        now: { date: "2026-10-01", minutes: 14 * 60 },
        items: [
          item("a", "Breakfast", { energyKcal: 400, proteinG: 20 }),
          item("b", "Lunch", { energyKcal: 700, proteinG: 35 }),
        ],
      }),
    );
    expect(day.completeness).toBe("IN_PROGRESS");
    expect(day.remaining.proteinG).toEqual({ status: "exact", value: 45, over: false });
  });

  it("treats a nutrient with unknown values as an upper bound", () => {
    const day = summarizeDay(
      base({
        markedComplete: true,
        items: [
          item("a", "Breakfast", { energyKcal: 400, proteinG: 20 }),
          item("b", "Lunch", { energyKcal: 700, proteinG: null }),
        ],
      }),
    );
    expect(day.totals.proteinG).toEqual({ value: 20, complete: false });
    expect(day.remaining.proteinG).toMatchObject({ status: "at_most", value: 80 });
    expect(day.remaining.energyKcal).toMatchObject({ status: "exact", value: 900 });
  });

  it("reports going over a target neutrally", () => {
    const day = summarizeDay(
      base({ markedComplete: true, items: [item("a", "Dinner", { energyKcal: 2300 })] }),
    );
    expect(day.remaining.energyKcal).toEqual({ status: "exact", value: 0, over: true });
  });

  it("lets the user confirm a day is complete", () => {
    expect(
      summarizeDay(base({ markedComplete: true, items: [item("a", "Breakfast", { energyKcal: 1 })] }))
        .completeness,
    ).toBe("COMPLETE");
  });

  it("treats past days' empty meals as not logged and future days as upcoming", () => {
    expect(summarizeDay(base({ date: "2026-09-30" })).slots.every((s) => s.status === "NOT_LOGGED")).toBe(
      true,
    );
    expect(summarizeDay(base({ date: "2026-10-02" })).slots.every((s) => s.status === "UPCOMING")).toBe(true);
  });

  it("shows entries logged to a meal that isn't in the current routine", () => {
    const day = summarizeDay(base({ items: [item("x", "Late snack", { energyKcal: 100 })] }));
    expect(day.slots.at(-1)).toMatchObject({ key: "Late snack", status: "LOGGED", itemIds: ["x"] });
  });

  it("marks estimates", () => {
    expect(
      summarizeDay(base({ items: [item("a", "Breakfast", { energyKcal: 100 }, true)] })).isEstimate,
    ).toBe(true);
  });

  it("marks a day with everything logged or skipped as complete", () => {
    const day = summarizeDay(
      base({
        now: { date: "2026-10-02", minutes: 60 },
        items: [
          item("a", "Breakfast", { energyKcal: 500 }),
          item("b", "Lunch", { energyKcal: 600 }),
          item("c", "Dinner", { energyKcal: 700 }),
        ],
        skipped: ["Snack"],
      }),
    );
    expect(day.completeness).toBe("COMPLETE");
  });
});
