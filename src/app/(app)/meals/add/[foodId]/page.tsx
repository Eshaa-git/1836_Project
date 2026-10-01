import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FindingsBox } from "@/features/foods/components/findings-box";
import { LogFoodForm } from "@/features/log/components/log-food-form";
import { requireUserContext } from "@/server/auth/session";
import { isDateOnly, localDateIn } from "@/server/domain/dates";
import { isAppError } from "@/server/lib/errors";
import { mealSlotLabels } from "@/server/services/food-log";
import { getFoodDetail } from "@/server/services/foods";

export const metadata: Metadata = { title: "Add food" };

export default async function AddSpecificFoodPage({
  params,
  searchParams,
}: PageProps<"/meals/add/[foodId]">) {
  const [{ foodId }, query] = await Promise.all([params, searchParams]);
  const ctx = await requireUserContext();
  const today = localDateIn(ctx.timezone, ctx.now);
  const date =
    typeof query.date === "string" && isDateOnly(query.date) && query.date <= today ? query.date : today;
  const slots = await mealSlotLabels(ctx.userId);
  const slot =
    typeof query.slot === "string" && query.slot.trim()
      ? query.slot.trim().slice(0, 40)
      : (slots[0] ?? "Snack");
  const food = await getFoodDetail(ctx.userId, foodId).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const returnTo = (date === today ? "/meals" : `/meals?date=${date}`) as Route;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={`/meals/add?date=${date}&slot=${encodeURIComponent(slot)}` as Route}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Search
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{food.name}</h1>
        {food.isEstimate && <Badge variant="secondary">Estimated values</Badge>}
      </div>
      <FindingsBox findings={food.findings} />
      <Card className="rounded-3xl">
        <CardContent className="pt-2">
          <LogFoodForm
            food={{
              id: food.id,
              name: food.name,
              category: food.category,
              portions: food.portions,
              per100g: food.per100g,
              isEstimate: food.isEstimate,
            }}
            date={date}
            slot={slot}
            slots={slots}
            returnTo={returnTo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
