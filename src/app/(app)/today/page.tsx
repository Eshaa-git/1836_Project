import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Compass,
  Droplet,
  Dumbbell,
  Plus,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { NutrientProgressRow } from "@/components/common/nutrient-progress-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chooseFocus } from "@/features/today/focus";
import { requireUserContext } from "@/server/auth/session";
import { evaluateActiveGoal } from "@/server/services/goals";
import { hasFoodPreferences } from "@/server/services/profile";
import { getCurrentTargets } from "@/server/services/targets";
import { TodayHeading } from "./today-heading";

export const metadata: Metadata = { title: "Today" };

const quickActions: { label: string; href: Route; icon: LucideIcon }[] = [
  { label: "Log food", href: "/meals", icon: Plus },
  { label: "Ask coach", href: "/coach", icon: Bot },
  { label: "Log water", href: "/today", icon: Droplet },
  { label: "Log workout", href: "/workouts", icon: Dumbbell },
];

// Food logging arrives in Phase 4; until then "eaten" is unknown — shown as "—", never 0.
const nutrients = [
  { key: "caloriesKcal", name: "Calories", unit: "kcal", tone: "energy" },
  { key: "proteinG", name: "Protein", unit: "g", tone: "protein" },
  { key: "carbsG", name: "Carbs", unit: "g", tone: "carbs" },
  { key: "fatG", name: "Fat", unit: "g", tone: "fat" },
  { key: "fiberG", name: "Fiber", unit: "g", tone: "fiber" },
] as const;

export default async function TodayPage() {
  const ctx = await requireUserContext();
  const [targets, goal, foodPreferences] = await Promise.all([
    getCurrentTargets(ctx.userId),
    evaluateActiveGoal(ctx),
    hasFoodPreferences(ctx.userId),
  ]);
  const focus = chooseFocus({
    goalState: goal?.evaluation.state ?? null,
    hasTargets: Boolean(targets),
    hasRestrictionsInfo: foodPreferences,
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
            <CardTitle>Nutrition</CardTitle>
            <CardDescription>Target → eaten → remaining</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!targets && (
              <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Link href="/profile/targets" className="text-primary underline-offset-4 hover:underline">
                  Set your daily targets
                </Link>{" "}
                to see what remains each day.
              </p>
            )}
            {nutrients.map((n) => (
              <NutrientProgressRow
                key={n.name}
                name={n.name}
                unit={n.unit}
                tone={n.tone}
                consumed={null}
                target={targets?.[n.key] ?? null}
                hideHint={!targets}
              />
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
            <NutrientProgressRow
              name="Water"
              unit="ml"
              tone="water"
              consumed={null}
              target={targets?.waterMl ?? null}
            />
            <NutrientProgressRow
              name="Sleep"
              unit="h"
              tone="sleep"
              consumed={null}
              target={targets?.sleepHours ?? null}
            />
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
