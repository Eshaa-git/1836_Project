import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { choiceFor } from "@/features/foods/portion-choice";
import { EditEntryForm } from "@/features/log/components/log-food-form";
import { formatDate } from "@/lib/format";
import { requireUserContext } from "@/server/auth/session";
import { localDateIn, localMinutesIn } from "@/server/domain/dates";
import { isAppError } from "@/server/lib/errors";
import { getEntry, mealSlotLabels } from "@/server/services/food-log";
import { getFoodDetail } from "@/server/services/foods";

export const metadata: Metadata = { title: "Edit entry" };

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export default async function EditEntryPage({ params }: PageProps<"/meals/entry/[id]">) {
  const { id } = await params;
  const ctx = await requireUserContext();
  const notFoundOn = (e: unknown) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  };
  const entry = await getEntry(ctx, id).catch(notFoundOn);
  const [slots, food] = await Promise.all([
    mealSlotLabels(ctx.userId),
    entry.foodId ? getFoodDetail(ctx.userId, entry.foodId).catch(() => null) : Promise.resolve(null),
  ]);
  const today = localDateIn(ctx.timezone, ctx.now);
  const returnTo = (entry.localDate === today ? "/meals" : `/meals?date=${entry.localDate}`) as Route;

  // Without the original food we can only scale by quantity, in grams.
  const editableFood = food ?? {
    id: "",
    name: entry.foodName,
    category: null,
    portions: [],
    per100g: Object.fromEntries(
      Object.entries(entry.amounts).map(([k, v]) => [k, v === null ? null : (v * 100) / entry.grams]),
    ) as typeof entry.amounts,
    isEstimate: entry.isEstimate,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={returnTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Meals
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{entry.foodName}</h1>
        <p className="text-muted-foreground">
          {entry.mealSlot} · {entry.localDate === today ? "Today" : formatDate(entry.localDate)}
        </p>
      </div>
      <Card className="rounded-3xl">
        <CardContent className="pt-2">
          <EditEntryForm
            entryId={entry.id}
            food={editableFood}
            initialChoice={food ? choiceFor(entry, food.portions) : "u:g"}
            initialQuantity={String(food ? entry.quantity : Math.round(entry.grams * 10) / 10)}
            slot={entry.mealSlot}
            initialTime={hhmm(localMinutesIn(ctx.timezone, new Date(entry.eatenAt)))}
            slots={slots}
            returnTo={returnTo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
