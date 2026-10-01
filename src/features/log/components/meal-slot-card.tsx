import type { Route } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, formatTime } from "@/lib/format";
import type { SlotView } from "@/server/domain/logging/day";
import type { LogEntryView } from "@/server/services/food-log";
import { cn } from "@/lib/utils";
import { SkipPrompt, SlotMenu, UndoSkip } from "./slot-actions";

const STATUS: Record<SlotView["status"], { label: string; className: string }> = {
  LOGGED: { label: "Logged", className: "bg-success/15 text-success" },
  SKIPPED: { label: "Skipped", className: "bg-muted text-muted-foreground" },
  NOT_LOGGED: { label: "Not logged", className: "bg-warning/15 text-warning" },
  UPCOMING: { label: "Upcoming", className: "bg-secondary text-secondary-foreground" },
};

export function amountLabel(e: Pick<LogEntryView, "quantity" | "unit" | "portionLabel" | "grams">) {
  if (e.unit === "portion" && e.portionLabel) {
    return e.quantity === 1 ? e.portionLabel : `${formatNumber(e.quantity, 2)} × ${e.portionLabel}`;
  }
  return e.unit === "g"
    ? `${formatNumber(e.grams)} g`
    : `${formatNumber(e.quantity, 2)} ${e.unit} · ${formatNumber(e.grams)} g`;
}

export function MealSlotCard({
  slot,
  entries,
  date,
  previousDate,
}: {
  slot: SlotView;
  entries: LogEntryView[];
  date: string;
  previousDate: string;
}) {
  const status = STATUS[slot.status];
  const addHref = `/meals/add?date=${date}&slot=${encodeURIComponent(slot.key)}` as Route;
  const kcal = entries.map((e) => e.amounts.energyKcal);
  const knownKcal = kcal.filter((k): k is number => k !== null);

  return (
    <section aria-labelledby={`slot-${slot.key}`} className="rounded-3xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`slot-${slot.key}`} className="font-medium">
            {slot.label}
          </h3>
          {slot.time && <span className="text-sm text-muted-foreground">{formatTime(slot.time)}</span>}
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center">
          {entries.length > 0 && (
            <span className="mr-1 text-sm text-muted-foreground tabular-nums">
              {knownKcal.length < kcal.length ? "≥ " : entries.some((e) => e.isEstimate) ? "~" : ""}
              {formatNumber(
                knownKcal.reduce((a, b) => a + b, 0),
                0,
              )}{" "}
              kcal
            </span>
          )}
          <SlotMenu date={date} previousDate={previousDate} slot={slot.key} hasEntries={entries.length > 0} />
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="mt-3 divide-y">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/meals/entry/${e.id}` as Route}
                className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-muted/60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{e.foodName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{amountLabel(e)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
                  {e.isEstimate && <Badge variant="secondary">Est.</Badge>}
                  {e.amounts.energyKcal === null
                    ? "? kcal"
                    : `${e.isEstimate ? "~" : ""}${formatNumber(e.amounts.energyKcal, 0)} kcal`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {slot.status === "NOT_LOGGED" && (
        <p className="mt-3 text-sm text-muted-foreground">Did you skip this, or just not log it yet?</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {slot.status !== "SKIPPED" && (
          <Button asChild size="sm" variant={slot.status === "NOT_LOGGED" ? "default" : "outline"}>
            <Link href={addHref}>
              <Plus aria-hidden /> {slot.status === "NOT_LOGGED" ? "Log it" : "Add food"}
            </Link>
          </Button>
        )}
        {slot.status === "NOT_LOGGED" && <SkipPrompt date={date} slot={slot.key} />}
        {slot.status === "SKIPPED" && <UndoSkip date={date} slot={slot.key} />}
      </div>
    </section>
  );
}
