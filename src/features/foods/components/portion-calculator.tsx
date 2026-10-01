"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/common/field";
import { NativeSelect } from "@/components/common/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { scaleProfile } from "@/server/domain/nutrition/amounts";
import { parseQuantity, resolveGrams, type FoodPortion } from "@/server/domain/nutrition/food-units";
import type { NutrientProfile } from "@/server/domain/nutrition/nutrients";
import { NutritionPanel } from "./nutrition-panel";

const GENERIC_UNITS = [
  ["g", "grams"],
  ["oz", "ounces"],
  ["piece", "pieces / whole"],
  ["cup", "cups"],
  ["tbsp", "tablespoons"],
  ["tsp", "teaspoons"],
  ["ml", "ml"],
  ["bowl", "bowls (~250 ml)"],
  ["katori", "katoris (~150 ml)"],
  ["glass", "glasses (~250 ml)"],
] as const;

/** What the calculator currently describes, in the shape logging actions accept. */
export type PortionSelection = {
  quantityText: string;
  amount: { kind: "portion"; portionIndex: number } | { kind: "unit"; unit: string };
  /** False while the amount is invalid or needs clarification. */
  ready: boolean;
};

type Props = {
  /** Start from an existing amount (editing an entry). */
  initial?: { quantityText: string; choice: string };
  /** Renders below the calculator, e.g. an "Add to Breakfast" button. */
  renderAction?: (selection: PortionSelection) => React.ReactNode;
  food: {
    name: string;
    category: string | null;
    portions: FoodPortion[];
    per100g: NutrientProfile;
    isEstimate: boolean;
  };
};

/**
 * "How much did you have?" — converts a quantity + unit to grams with the
 * deterministic unit engine and shows the nutrients for that amount.
 */
export function PortionCalculator({ food, initial, renderAction }: Props) {
  const [quantityText, setQuantityText] = useState(initial?.quantityText ?? "1");
  // "p:<index>" = one of the food's own portions, "u:<unit>" = a generic unit.
  const [choice, setChoice] = useState(initial?.choice ?? (food.portions.length ? "p:0" : "u:g"));
  const quantity = parseQuantity(quantityText);

  const result = useMemo(() => {
    if (quantity === null) return null;
    if (choice.startsWith("p:")) {
      const portion = food.portions[Number(choice.slice(2))]!;
      return {
        ok: true as const,
        grams: quantity * (portion.gramWeight / portion.amount),
        isEstimate: Boolean(portion.isEstimate),
        note: undefined,
      };
    }
    return resolveGrams(food, quantity, choice.slice(2));
  }, [quantity, choice, food]);

  const isEstimate = Boolean(result?.ok && (result.isEstimate || food.isEstimate));
  const selection: PortionSelection = {
    quantityText,
    amount: choice.startsWith("p:")
      ? { kind: "portion", portionIndex: Number(choice.slice(2)) }
      : { kind: "unit", unit: choice.slice(2) },
    ready: Boolean(result?.ok),
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field
          label="Amount"
          htmlFor="qty"
          errors={quantity === null ? ["Enter an amount like 1, 1.5 or 1/2."] : undefined}
        >
          <Input
            id="qty"
            inputMode="decimal"
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value)}
            className="h-10"
          />
        </Field>
        <Field label="Unit" htmlFor="unit">
          <NativeSelect id="unit" value={choice} onChange={(e) => setChoice(e.target.value)}>
            {food.portions.length > 0 && (
              <optgroup label={`Portions for ${food.name}`}>
                {food.portions.map((p, i) => (
                  <option key={i} value={`p:${i}`}>
                    × {p.label}
                    {/\d\s?g\)?$/.test(p.label) ? "" : ` (${formatNumber(p.gramWeight)} g)`}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Other units">
              {GENERIC_UNITS.map(([unit, label]) => (
                <option key={unit} value={`u:${unit}`}>
                  {label}
                </option>
              ))}
            </optgroup>
          </NativeSelect>
        </Field>
      </div>

      {result && !result.ok && (
        <div
          role="status"
          className="space-y-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm"
        >
          <p>{result.message}</p>
          {result.options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.options.map((o) => {
                const index = food.portions.findIndex((p) => p.label === o.label);
                return (
                  <Button
                    key={o.label}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setChoice(index >= 0 ? `p:${index}` : "u:g")}
                  >
                    {o.label} · {formatNumber(o.grams)} g
                  </Button>
                );
              })}
              <Button type="button" size="sm" variant="ghost" onClick={() => setChoice("u:g")}>
                Use grams
              </Button>
            </div>
          )}
        </div>
      )}

      {result?.ok && (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            ={" "}
            <span className="font-medium text-foreground">
              {isEstimate && "~"}
              {formatNumber(result.grams)} g
            </span>
            {result.note && <> · {result.note}</>}
          </p>
          <NutritionPanel
            amounts={scaleProfile(food.per100g, result.grams)}
            isEstimate={isEstimate}
            heading="For this amount"
          />
        </>
      )}
      {renderAction?.(selection)}
    </div>
  );
}
