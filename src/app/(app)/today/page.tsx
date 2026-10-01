import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Compass, Dumbbell, History, Plus, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletenessNote } from "@/features/log/components/completeness-note";
import { DayTotals } from "@/features/log/components/day-totals";
import { HydrationCard } from "@/features/log/components/hydration-card";
import { SleepCard } from "@/features/log/components/sleep-card";
import { chooseFocus } from "@/features/today/focus";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUserContext } from "@/server/auth/session";
import { localDateIn } from "@/server/domain/dates";
import type { SlotView } from "@/server/domain/logging/day";
import { getDayLog } from "@/server/services/food-log";
import { evaluateActiveGoal } from "@/server/services/goals";
import { getProfileView, hasFoodPreferences } from "@/server/services/profile";
import { getHydrationDay, getSleep } from "@/server/services/wellness-logs";
import { TodayHeading } from "./today-heading";

export const metadata: Metadata = { title: "Today" };

const quickActions: { label: string; href: Route; icon: LucideIcon }[] = [
  { label: "Log food", href: "/meals/add", icon: Plus },
  { label: "Ask coach", href: "/coach", icon: Bot },
  { label: "Food history", href: "/meals/history", icon: History },
  { label: "Log workout", href: "/workouts", icon: Dumbbell },
];

const SLOT_STYLE: Record<SlotView["status"], { label: string; className: string }> = {
  LOGGED: { label: "Logged", className: "bg-success/15 text-success" },
  SKIPPED: { label: "Skipped", className: "bg-muted text-muted-foreground" },
  NOT_LOGGED: { label: "Not logged", className: "bg-warning/15 text-warning" },
  UPCOMING: { label: "Upcoming", className: "bg-secondary text-secondary-foreground" },
};

export default async function TodayPage() {
  const ctx = await requireUserContext();
  const today = localDateIn(ctx.timezone, ctx.now);
  const [day, goal, foodPreferences, hydration, sleep, profile] = await Promise.all([
    getDayLog(ctx, today),
    evaluateActiveGoal(ctx),
    hasFoodPreferences(ctx.userId),
    getHydrationDay(ctx.userId, today),
    getSleep(ctx.userId, today),
    getProfileView(ctx.userId, today),
  ]);
  const hasTargets = Object.values(day.targets).some((v) => v !== null && v !== undefined);
  const focus = chooseFocus({
    goalState: goal?.evaluation.state ?? null,
    hasTargets,
    hasRestrictionsInfo: foodPreferences,
    unloggedSlot: day.summary.unloggedSlots[0] ?? null,
  });

  return (
    <div className="space-y-6">
      <TodayHeading />

      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-sm font-medium transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <Card className="rounded-3xl border-primary/20 bg-secondary/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="size-4 text-primary" aria-hidden /> Focus next: {focus.title}
          </CardTitle>
          <CardDescription>{focus.body}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={focus.href}>
              {focus.cta} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>
              <h2>Nutrition</h2>
            </CardTitle>
            <CardDescription>Target → eaten → remaining</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasTargets && (
              <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Link href="/profile/targets" className="text-primary underline-offset-4 hover:underline">
                  Set your daily targets
                </Link>{" "}
                to see what remains each day.
              </p>
            )}
            <CompletenessNote
              completeness={day.summary.completeness}
              date={today}
              markedComplete={day.markedComplete}
              hasEntries={day.entries.length > 0}
            />
            <DayTotals day={day} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <h2>Today&apos;s meals</h2>
            </CardTitle>
            <Link href="/meals" className="text-sm text-primary underline-offset-4 hover:underline">
              Open log
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {day.summary.slots.map((slot) => {
                const style = SLOT_STYLE[slot.status];
                return (
                  <li key={slot.key} className="flex items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="font-medium">{slot.label}</span>
                      {slot.time && (
                        <span className="ml-2 text-sm text-muted-foreground">{formatTime(slot.time)}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", style.className)}>
                        {style.label}
                      </span>
                      {(slot.status === "NOT_LOGGED" || slot.status === "UPCOMING") && (
                        <Link
                          href={`/meals/add?slot=${encodeURIComponent(slot.key)}` as Route}
                          className="text-sm text-primary underline-offset-4 hover:underline"
                          aria-label={`Log ${slot.label}`}
                        >
                          Log
                        </Link>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>
              <h2>Hydration &amp; sleep</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <HydrationCard date={today} day={hydration} targetMl={day.targets.waterMl ?? null} />
            <SleepCard
              date={today}
              sleep={sleep}
              targetHours={day.targets.sleepHours ?? null}
              defaults={{ bedtime: profile.bedTime ?? "23:00", wakeTime: profile.wakeTime ?? "07:00" }}
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>
              <h2>Workout</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={Dumbbell}
              title="Nothing logged today"
              description="Workout tracking arrives soon — walks will count too."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
