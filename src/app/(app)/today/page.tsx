import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  CalendarPlus,
  Dumbbell,
  PackagePlus,
  Plus,
  Refrigerator,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { NutrientProgressRow } from "@/components/common/nutrient-progress-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TodayHeading } from "./today-heading";

export const metadata: Metadata = { title: "Today" };

const quickActions: { label: string; href: Route; icon: LucideIcon }[] = [
  { label: "Log food", href: "/meals", icon: Plus },
  { label: "Start workout", href: "/workouts", icon: Dumbbell },
  { label: "Add to pantry", href: "/pantry", icon: PackagePlus },
  { label: "Plan meal", href: "/meals", icon: CalendarPlus },
];

// Until targets and food logs exist (Phases 3 & 8) every value is unknown — shown as "—", never 0.
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl md:row-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s meals</CardTitle>
            <CardDescription>Breakfast, lunch, dinner and snacks</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={UtensilsCrossed}
              title="No meals planned yet"
              description="Once your profile and pantry are set up, we'll suggest meals that fit your targets."
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Nutrition</CardTitle>
            <CardDescription>Only food you&apos;ve eaten counts here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              Your daily targets are calculated when you finish setting up your profile.
            </p>
            {nutrients.map((n) => (
              <NutrientProgressRow key={n.name} {...n} consumed={null} target={null} hideHint />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Today&apos;s workout</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={Dumbbell}
              title="Nothing scheduled"
              description="Log any activity — walks count too."
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Pantry alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={Refrigerator}
              title="No alerts"
              description="Items close to their use-by date will show up here."
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={TrendingUp}
              title="Not enough data yet"
              description="Trends appear after a few days of measurements and logs."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
