import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { amountLabel } from "@/features/log/components/meal-slot-card";
import { formatDate, formatNumber } from "@/lib/format";
import { historyQuerySchema } from "@/lib/validation/logging";
import { requireUserContext } from "@/server/auth/session";
import { localDateIn } from "@/server/domain/dates";
import { searchHistory } from "@/server/services/food-log";

export const metadata: Metadata = { title: "Food history" };

export default async function HistoryPage({ searchParams }: PageProps<"/meals/history">) {
  const raw = await searchParams;
  const pick = (k: string) => (typeof raw[k] === "string" && raw[k] ? (raw[k] as string) : null);
  const parsed = historyQuerySchema.safeParse({
    q: pick("q") ?? "",
    from: pick("from"),
    to: pick("to"),
    mealSlot: pick("meal"),
  });
  const query = parsed.success ? parsed.data : { q: "", from: null, to: null, mealSlot: null };
  const ctx = await requireUserContext();
  const today = localDateIn(ctx.timezone, ctx.now);
  const days = await searchHistory(ctx, query, 300);
  const searching = Boolean(query.q || query.from || query.to || query.mealSlot);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/meals"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Meals
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Food history</h1>
        <p className="text-muted-foreground">
          Find what you ate — “dosa”, last week&apos;s breakfasts, and more.
        </p>
      </div>

      <form
        role="search"
        className="grid gap-3 rounded-3xl border bg-card p-4 sm:grid-cols-[1fr_9rem_9rem_8rem_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="q">Food</Label>
          <Input id="q" name="q" defaultValue={query.q} placeholder="e.g. dosa" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            name="from"
            type="date"
            max={today}
            defaultValue={query.from ?? ""}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" max={today} defaultValue={query.to ?? ""} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meal">Meal</Label>
          <Input
            id="meal"
            name="meal"
            defaultValue={query.mealSlot ?? ""}
            placeholder="Breakfast"
            className="h-10"
          />
        </div>
        <Button type="submit" size="lg" className="h-10">
          Search
        </Button>
      </form>

      {days.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={searching ? "Nothing found" : "No history yet"}
          description={
            searching ? "Try another food name or a wider date range." : "Foods you log will appear here."
          }
        />
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <Card key={d.date} className="rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  <h2>{d.date === today ? "Today" : formatDate(d.date)}</h2>
                </CardTitle>
                <Link
                  href={(d.date === today ? "/meals" : `/meals?date=${d.date}`) as Route}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open day
                </Link>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {d.entries.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-medium">{e.mealSlot}:</span> {e.foodName}
                        <span className="block text-xs text-muted-foreground">{amountLabel(e)}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {e.amounts.energyKcal === null
                          ? "?"
                          : `${e.isEstimate ? "~" : ""}${formatNumber(e.amounts.energyKcal, 0)}`}{" "}
                        kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
