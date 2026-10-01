import type { Metadata } from "next";
import Link from "next/link";
import { History, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getNavItem } from "@/config/navigation";
import { CompletenessNote } from "@/features/log/components/completeness-note";
import { DayNav } from "@/features/log/components/day-nav";
import { DayTotals } from "@/features/log/components/day-totals";
import { MealSlotCard } from "@/features/log/components/meal-slot-card";
import { requireUserContext } from "@/server/auth/session";
import { addDays, isDateOnly, localDateIn } from "@/server/domain/dates";
import { getDayLog } from "@/server/services/food-log";

export const metadata: Metadata = { title: "Meals" };

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const { date: rawDate } = await searchParams;
  const ctx = await requireUserContext();
  const today = localDateIn(ctx.timezone, ctx.now);
  const date = typeof rawDate === "string" && isDateOnly(rawDate) && rawDate <= today ? rawDate : today;
  const day = await getDayLog(ctx, date);
  const item = getNavItem("meals");

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.label}
        description={item.description}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/meals/foods">
                <Search aria-hidden /> Look up a food
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/meals/history">
                <History aria-hidden /> History
              </Link>
            </Button>
          </>
        }
      />
      <DayNav date={date} today={today} basePath="/meals" />

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 pt-2">
          <CompletenessNote
            completeness={day.summary.completeness}
            date={date}
            markedComplete={day.markedComplete}
            hasEntries={day.entries.length > 0}
          />
          <DayTotals day={day} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {day.summary.slots.map((slot) => (
          <MealSlotCard
            key={slot.key}
            slot={slot}
            entries={day.entries.filter((e) => slot.itemIds.includes(e.id))}
            date={date}
            previousDate={addDays(date, -1)}
          />
        ))}
      </div>
    </div>
  );
}
