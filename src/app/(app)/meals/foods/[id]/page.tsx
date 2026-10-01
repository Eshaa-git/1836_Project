import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FindingsBox } from "@/features/foods/components/findings-box";
import { NutritionPanel } from "@/features/foods/components/nutrition-panel";
import { PortionCalculator } from "@/features/foods/components/portion-calculator";
import { formatNumber } from "@/lib/format";
import { requireUserContext } from "@/server/auth/session";
import { getAllergen } from "@/server/domain/dietary/allergens";
import { isAppError } from "@/server/lib/errors";
import { getFoodDetail, type FoodDetail } from "@/server/services/foods";

export const metadata: Metadata = { title: "Food" };

type RecipeBasis = {
  kind: "recipe";
  cookedWeightG: number;
  note: string | null;
  ingredients: { name: string; grams: number; role: string; note: string | null }[];
};

function isRecipeBasis(basis: unknown): basis is RecipeBasis {
  return typeof basis === "object" && basis !== null && (basis as { kind?: string }).kind === "recipe";
}

function Source({ food }: { food: FoodDetail }) {
  if (food.source === "USDA_SR_LEGACY") {
    return (
      <p className="text-xs text-muted-foreground">
        Source: USDA FoodData Central, {food.sourceVersion} (public domain). Values per 100 g as published.
      </p>
    );
  }
  if (isRecipeBasis(food.basis)) {
    return (
      <details className="rounded-2xl border p-3 text-sm">
        <summary className="cursor-pointer font-medium">How we estimated this</summary>
        <p className="mt-2 text-muted-foreground">
          Calculated from a typical home recipe using USDA ingredient data. The batch weighs about{" "}
          {formatNumber(food.basis.cookedWeightG)} g once cooked. Your recipe may differ.
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {food.basis.ingredients.map((i) => (
            <li key={i.name}>
              {formatNumber(i.grams)} g {i.name}
              {i.role === "COOKING_FAT" && " (cooking fat)"}
              {i.note && <span className="text-muted-foreground"> — {i.note}</span>}
            </li>
          ))}
        </ul>
        {food.basis.note && <p className="mt-2 text-muted-foreground">{food.basis.note}</p>}
      </details>
    );
  }
  return null;
}

export default async function FoodDetailPage({ params }: PageProps<"/meals/foods/[id]">) {
  const { id } = await params;
  const ctx = await requireUserContext();
  const food = await getFoodDetail(ctx.userId, id).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/meals/foods"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Food search
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{food.name}</h1>
        <div className="flex flex-wrap gap-2">
          {food.category && <Badge variant="outline">{food.category}</Badge>}
          {food.isEstimate && <Badge variant="secondary">Estimated values</Badge>}
        </div>
      </div>

      <FindingsBox findings={food.findings} />

      <Card className="rounded-3xl">
        <CardContent className="pt-2">
          <h2 className="mb-4 font-medium">How much?</h2>
          <PortionCalculator
            food={{
              name: food.name,
              category: food.category,
              portions: food.portions,
              per100g: food.per100g,
              isEstimate: food.isEstimate,
            }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 pt-2">
          <NutritionPanel amounts={food.per100g} isEstimate={food.isEstimate} heading="Per 100 g" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Allergens</p>
            <p className="text-muted-foreground">
              {food.allergens.contains.length
                ? `Contains: ${food.allergens.contains.map((c) => getAllergen(c).label).join(", ")}.`
                : "None detected."}{" "}
              {food.allergens.assessment === "UNVERIFIED"
                ? "This is a prepared food or recipe, so other allergens may be present — always check the label or ingredients."
                : "Based on the food's description."}
            </p>
          </div>
          <Source food={food} />
        </CardContent>
      </Card>
    </div>
  );
}
