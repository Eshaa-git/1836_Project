"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const subscribe = () => () => {};

/**
 * Greeting and date in the viewer's local time. Rendered on the client so the
 * date is never a server-UTC "tomorrow". Phase 2 switches this to the
 * timezone saved in the user's profile.
 */
export function TodayHeading() {
  const now = useSyncExternalStore(
    subscribe,
    () => new Date().toDateString(),
    () => null,
  );
  const date = now ? new Date(now) : null;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground" suppressHydrationWarning>
        {date ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {date ? greetingFor(new Date().getHours()) : "Today"}
      </h1>
    </div>
  );
}
