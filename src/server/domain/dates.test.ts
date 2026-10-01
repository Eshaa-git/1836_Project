import { describe, expect, it } from "vitest";
import {
  addDays,
  ageOn,
  daysBetween,
  fromDateOnly,
  isDateOnly,
  isTimeOfDay,
  isValidTimezone,
  localDateIn,
  localMinutesIn,
  sleepDurationMin,
  zonedTimeToUtc,
  toDateOnly,
} from "./dates";

describe("dates", () => {
  it("validates calendar dates strictly", () => {
    expect(isDateOnly("2026-02-28")).toBe(true);
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-2-3")).toBe(false);
  });

  it("round-trips DATE column values", () => {
    expect(toDateOnly(fromDateOnly("2026-09-30"))).toBe("2026-09-30");
  });

  it("computes the local calendar date in a timezone", () => {
    const instant = new Date("2026-10-01T02:30:00Z");
    expect(localDateIn("UTC", instant)).toBe("2026-10-01");
    expect(localDateIn("America/Chicago", instant)).toBe("2026-09-30");
    expect(localDateIn("Asia/Kolkata", instant)).toBe("2026-10-01");
  });

  it("recognises valid timezones", () => {
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
  });

  it("adds days across month and leap-year boundaries", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-09-30", "2026-10-14")).toBe(14);
  });

  it("computes age in completed years", () => {
    expect(ageOn("2000-10-01", "2026-09-30")).toBe(25);
    expect(ageOn("2000-10-01", "2026-10-01")).toBe(26);
    expect(ageOn("2004-02-29", "2026-02-28")).toBe(21);
  });

  it("validates HH:MM times", () => {
    expect(isTimeOfDay("07:30")).toBe(true);
    expect(isTimeOfDay("24:00")).toBe(false);
    expect(isTimeOfDay("7:30")).toBe(false);
  });

  it("gives local minutes since midnight", () => {
    expect(localMinutesIn("Asia/Kolkata", new Date("2026-10-01T02:30:00Z"))).toBe(8 * 60);
  });

  it("converts a local wall-clock time to UTC, including across DST", () => {
    expect(zonedTimeToUtc("2026-10-01", "08:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-10-01T02:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-07-01", "08:00", "America/New_York").toISOString()).toBe(
      "2026-07-01T12:00:00.000Z",
    );
    expect(zonedTimeToUtc("2026-12-01", "08:00", "America/New_York").toISOString()).toBe(
      "2026-12-01T13:00:00.000Z",
    );
  });

  it("computes sleep across midnight", () => {
    expect(sleepDurationMin("23:30", "07:00")).toBe(450);
    expect(sleepDurationMin("01:00", "08:30")).toBe(450);
    expect(sleepDurationMin("14:00", "15:30")).toBe(90);
  });
});
