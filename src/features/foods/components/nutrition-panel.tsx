import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { NUTRIENTS, type NutrientKey, type NutrientProfile } from "@/server/domain/nutrition/nutrients";
import { cn } from "@/lib/utils";

const MAIN: NutrientKey[] = ["energyKcal", "proteinG", "carbsG", "fatG", "fiberG"];

/**
 * Nutrients for an amount of food. Unknown values are shown as "Unknown",
 * never as 0. Estimates are labelled.
 */
export function NutritionPanel({
  amounts,
  isEstimate,
  heading,
}: {
  amounts: NutrientProfile;
  isEstimate: boolean;
  heading: string;
}) {
  const value = (key: NutrientKey) => {
    const v = amounts[key];
    const meta = NUTRIENTS.find((n) => n.key === key)!;
    if (v === null) return <span className="text-muted-foreground italic">Unknown</span>;
    return (
      <span className="tabular-nums">
        {isEstimate && "~"}
        {formatNumber(v, meta.decimals)} {meta.unit}
      </span>
    );
  };
  const details = NUTRIENTS.filter((n) => !MAIN.includes(n.key));

  return (
    <section aria-label={heading} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{heading}</h2>
        {isEstimate && <Badge variant="secondary">Estimate</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {MAIN.map((key) => {
          const meta = NUTRIENTS.find((n) => n.key === key)!;
          return (
            <div
              key={key}
              className={cn(
                "rounded-2xl bg-muted/60 p-3",
                key === "energyKcal" && "col-span-2 sm:col-span-1",
              )}
            >
              <dt className="text-xs text-muted-foreground">{meta.label}</dt>
              <dd className="text-lg font-semibold">{value(key)}</dd>
            </div>
          );
        })}
      </dl>
      <details className="group rounded-2xl border p-3 text-sm">
        <summary className="cursor-pointer list-none font-medium">More nutrients</summary>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {details.map((n) => (
            <div key={n.key} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{n.label}</dt>
              <dd>{value(n.key)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
