import { describe, expect, it } from "vitest";
import { formatDate, formatInstant, formatTime, humanize } from "./format";

describe("format", () => {
  it("formats calendar dates without timezone drift", () => {
    expect(formatDate("2027-03-01")).toBe("1 Mar 2027");
    expect(formatDate("2027-03-01", { withYear: false })).toBe("1 Mar");
  });

  it("formats instants in the user's timezone", () => {
    expect(formatInstant("2026-10-01T02:00:00Z", "America/Chicago")).toBe("30 Sept 2026");
  });

  it("formats 24h times for display", () => {
    expect(formatTime("07:30")).toBe("7:30 AM");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("19:00")).toBe("7:00 PM");
  });

  it("humanizes enum values", () => {
    expect(humanize("VERY_ACTIVE")).toBe("Very active");
  });
});
