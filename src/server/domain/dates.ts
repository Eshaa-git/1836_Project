/**
 * Date helpers. Calendar dates are "YYYY-MM-DD" strings in the domain layer;
 * Postgres DATE columns map to Date objects at UTC midnight.
 */
export type DateOnly = string;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): value is DateOnly {
  if (!DATE_ONLY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Date at UTC midnight for a DATE column. */
export function fromDateOnly(value: DateOnly): Date {
  if (!isDateOnly(value)) throw new Error(`Invalid date: ${value}`);
  return new Date(`${value}T00:00:00Z`);
}

/** Reads a DATE column value (UTC midnight) back into "YYYY-MM-DD". */
export function toDateOnly(date: Date): DateOnly {
  return date.toISOString().slice(0, 10);
}

/** The calendar date of `instant` in the given IANA timezone. */
export function localDateIn(timezone: string, instant: Date): DateOnly {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const d = fromDateOnly(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateOnly(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: DateOnly, b: DateOnly): number {
  return Math.round((fromDateOnly(b).getTime() - fromDateOnly(a).getTime()) / 86_400_000);
}

/** Age in completed years on a given date. */
export function ageOn(birthDate: DateOnly, onDate: DateOnly): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [y, m, d] = onDate.split("-").map(Number) as [number, number, number];
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

/** "HH:MM" 24-hour time. */
export function isTimeOfDay(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Minutes since local midnight for `instant` in `timezone`. */
export function localMinutesIn(timezone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return get("hour") * 60 + get("minute");
}

/** Offset (minutes) of `timezone` from UTC at `instant`, e.g. +330 for Asia/Kolkata. */
function offsetMinutes(timezone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * The UTC instant of a local wall-clock time ("2026-10-01", "08:30") in a
 * timezone. Handles DST by re-checking the offset at the candidate instant.
 */
export function zonedTimeToUtc(date: DateOnly, time: string, timezone: string): Date {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, m] = time.split(":").map(Number) as [number, number];
  const naive = Date.UTC(y, mo - 1, d, h, m);
  let guess = naive - offsetMinutes(timezone, new Date(naive)) * 60_000;
  guess = naive - offsetMinutes(timezone, new Date(guess)) * 60_000;
  return new Date(guess);
}

/**
 * Sleep length from bedtime to wake time (wall-clock "HH:MM"). A bedtime later
 * than the wake time is the previous evening. Returns minutes in (0, 1440].
 */
export function sleepDurationMin(bedtime: string, wakeTime: string): number {
  const bed = toMinutesOfDay(bedtime);
  const wake = toMinutesOfDay(wakeTime);
  const diff = (wake - bed + 1440) % 1440;
  return diff === 0 ? 1440 : diff;
}

function toMinutesOfDay(time: string) {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}
