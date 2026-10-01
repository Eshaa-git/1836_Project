import { CircleCheck, Info } from "lucide-react";
import type { DayCompleteness } from "@/server/domain/logging/day";
import { MarkDayButton } from "./mark-day-button";

const COPY: Record<DayCompleteness, string> = {
  COMPLETE: "Day marked complete — totals reflect everything you ate.",
  IN_PROGRESS: "So far so good. Totals update as you log.",
  PARTIAL: "Some meals aren't logged yet, so these totals may be incomplete.",
  NONE: "Nothing logged yet — we won't guess what you ate.",
};

export function CompletenessNote({
  completeness,
  date,
  markedComplete,
  hasEntries,
}: {
  completeness: DayCompleteness;
  date: string;
  markedComplete: boolean;
  hasEntries: boolean;
}) {
  const Icon = completeness === "COMPLETE" ? CircleCheck : Info;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 px-3 py-2 text-sm">
      <p className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {COPY[completeness]}
      </p>
      {(hasEntries || markedComplete) && <MarkDayButton date={date} complete={markedComplete} />}
    </div>
  );
}
