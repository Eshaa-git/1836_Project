/** Display formatting shared by server and client components. */

/** "2027-03-01" → "1 Mar 2027" (calendar dates are timezone-free). */
export function formatDate(dateOnly: string, opts: { withYear?: boolean } = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(opts.withYear === false ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${dateOnly}T00:00:00Z`));
}

/** ISO instant → "1 Oct 2026" in the user's timezone. */
export function formatInstant(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function formatNumber(value: number, maxDecimals = 1): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxDecimals }).format(value);
}

/** "07:30" → "7:30 AM". */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "BODY_WEIGHT_KG" → "Body weight kg" style fallback for enum labels. */
export function humanize(value: string): string {
  const s = value.toLowerCase().replaceAll("_", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
