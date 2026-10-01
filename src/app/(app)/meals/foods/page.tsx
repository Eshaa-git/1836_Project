import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronRight, SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FindingBadge } from "@/features/foods/components/findings-box";
import { formatNumber } from "@/lib/format";
import { requireUserContext } from "@/server/auth/session";
import { searchFoods } from "@/server/services/foods";

export const metadata: Metadata = { title: "Food search" };

const SUGGESTIONS = ["egg", "dosa", "dal", "apple", "chicken breast", "curd", "oats"];

export default async function FoodSearchPage({ searchParams }: PageProps<"/meals/foods">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const ctx = await requireUserContext();
  const results = query ? await searchFoods(ctx.userId, query) : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/meals"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Meals
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Food search</h1>
      </div>
      <form role="search" className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          aria-label="Search foods"
          placeholder="e.g. dosa, egg, chicken breast"
          className="h-11 text-base sm:h-10 sm:text-sm"
          autoFocus
        />
        <Button type="submit" size="lg" className="h-11 sm:h-10">
          Search
        </Button>
      </form>

      {!query && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Try:</span>
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              href={`/meals/foods?q=${encodeURIComponent(s)}` as Route}
              className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <EmptyState
          icon={SearchX}
          title={`No match for “${query}”`}
          description="Our food list doesn't include this yet. Try a simpler name (e.g. “yogurt” instead of a brand). Adding your own foods is coming soon."
        />
      )}

      {results.length > 0 && (
        <ul className="divide-y rounded-3xl border bg-card" aria-label="Results">
          {results.map((f) => (
            <li key={f.id}>
              <Link
                href={`/meals/foods/${f.id}` as Route}
                className="flex items-center gap-3 p-4 hover:bg-muted/50"
              >
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
