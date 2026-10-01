import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronRight, SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FindingBadge } from "@/features/foods/components/findings-box";
import { SavedMealList } from "@/features/log/components/saved-meal-list";
import { formatDate, formatNumber } from "@/lib/format";
import { requireUserContext } from "@/server/auth/session";
import { isDateOnly, localDateIn } from "@/server/domain/dates";
import { recentFoods } from "@/server/services/food-log";
import { searchFoods } from "@/server/services/foods";
import { listSavedMeals } from "@/server/services/saved-meals";

export const metadata: Metadata = { title: "Add food" };

export default async function AddFoodPage({ searchParams }: PageProps<"/meals/add">) {
  const params = await searchParams;
  const ctx = await requireUserContext();
  const today = localDateIn(ctx.timezone, ctx.now);
  const date =
    typeof params.date === "string" && isDateOnly(params.date) && params.date <= today ? params.date : today;
  const slot =
    typeof params.slot === "string" && params.slot.trim() ? params.slot.trim().slice(0, 40) : "Snack";
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const [results, saved, recent] = await Promise.all([
    query ? searchFoods(ctx.userId, query) : Promise.resolve([]),
    query ? Promise.resolve([]) : listSavedMeals(ctx.userId),
    query ? Promise.resolve([]) : recentFoods(ctx.userId),
  ]);
  const pick = (foodId: string) =>
    `/meals/add/${foodId}?date=${date}&slot=${encodeURIComponent(slot)}` as Route;
  const back = (date === today ? "/meals" : `/meals?date=${date}`) as Route;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={back}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Meals
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Add to {slot}</h1>
        <p className="text-muted-foreground">{date === today ? "Today" : formatDate(date)}</p>
      </div>

      <form role="search" className="flex gap-2">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="slot" value={slot} />
        <Input
          name="q"
          defaultValue={query}
          aria-label="Search foods"
          placeholder="What did you have?"
          className="h-11 text-base sm:h-10 sm:text-sm"
          autoFocus
        />
        <Button type="submit" size="lg" className="h-11 sm:h-10">
          Search
        </Button>
      </form>

      {!query && saved.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Saved meals</h2>
          <SavedMealList meals={saved} date={date} slot={slot} />
        </section>
      )}

      {!query && recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Recent</h2>
          <ul className="flex flex-wrap gap-2">
            {recent.map((f) => (
              <li key={f.foodId}>
                <Link
                  href={pick(f.foodId)}
                  className="inline-block rounded-full border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  {f.foodName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {query && results.length === 0 && (
        <EmptyState
          icon={SearchX}
          title={`No match for “${query}”`}
          description="Try a simpler name. Adding your own foods is coming soon."
        />
      )}

      {results.length > 0 && (
        <ul className="divide-y rounded-3xl border bg-card" aria-label="Results">
          {results.map((f) => (
            <li key={f.id}>
              <Link href={pick(f.id)} className="flex items-center gap-3 p-4 hover:bg-muted/50">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{f.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {f.energyKcalPer100g === null
                        ? "Calories unknown"
                        : `${formatNumber(f.energyKcalPer100g, 0)} kcal / 100 g`}
                    </span>
                    {f.isEstimate && <Badge variant="secondary">Estimate</Badge>}
                    <FindingBadge finding={f.topFinding} />
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
