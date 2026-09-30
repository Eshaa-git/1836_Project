import type { Metadata, Route } from "next";
import Link from "next/link";
import { Bot, Compass, Droplet, Dumbbell, Plus, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { NutrientProgressRow } from "@/components/common/nutrient-progress-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TodayHeading } from "./today-heading";

export const metadata: Metadata = { title: "Today" };

const quickActions: { label: string; href: Route; icon: LucideIcon }[] = [
  { label: "Log food", href: "/meals", icon: Plus },
  { label: "Ask coach", href: "/coach", icon: Bot },
  { label: "Log water", href: "/today", icon: Droplet },
  { label: "Log workout", href: "/workouts", icon: Dumbbell },
];

// Until targets and logs exist every value is unknown — shown as "—", never 0.
const nutrients = [
  { name: "Calories", unit: "kcal", tone: "energy" },
  { name: "Protein", unit: "g", tone: "protein" },
  { name: "Carbs", unit: "g", tone: "carbs" },
  { name: "Fat", unit: "g", tone: "fat" },
  { name: "Fiber", unit: "g", tone: "fiber" },
] as const;

export default function TodayPage() {
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
            <Compass className="size-4 text-primary" aria-hidden /> Focus next
          </CardTitle>
          <CardDescription>
            Set up your profile and daily targets, then tell the coach what you&apos;ve eaten — it will
            suggest what to eat next.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Nutrition</CardTitle>
            <CardDescription>Target → eaten → remaining</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              You&apos;ll set your daily targets in your profile.
            </p>
            {nutrients.map((n) => (
              <NutrientProgressRow key={n.name} {...n} consumed={null} target={null} hideHint />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Today&apos;s meals</CardTitle>
            <CardDescription>Logged, skipped, not logged yet, or upcoming</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={UtensilsCrossed}
              title="No meals logged yet"
              description="Tell the coach what you ate — “two eggs and a medium apple” is enough."
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Hydration &amp; sleep</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NutrientProgressRow name="Water" unit="ml" tone="water" consumed={null} target={null} />
            <NutrientProgressRow name="Sleep" unit="h" tone="sleep" consumed={null} target={null} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Workout</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={Dumbbell}
              title="Nothing logged today"
              description="Just mark a workout done, or add sets and reps if you want to track progress."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
