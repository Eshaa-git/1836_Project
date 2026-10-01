import {
  describeNutrientProgress,
  describeRemaining,
  type NutrientProgressState,
  type RemainingDisplay,
} from "@/lib/nutrient-progress";
import { cn } from "@/lib/utils";

type Tone = "energy" | "protein" | "carbs" | "fat" | "fiber" | "water" | "sleep";

const barTone: Record<Tone, string> = {
  energy: "bg-energy",
  protein: "bg-protein",
  carbs: "bg-carbs",
  fat: "bg-fat",
  fiber: "bg-fiber",
  water: "bg-water",
  sleep: "bg-sleep",
};

const stateHint: Record<NutrientProgressState, string | null> = {
  "no-target": "No target yet",
  "not-logged": "Not logged yet",
  under: null,
  met: "Target reached",
  over: "Above target",
};

type Props = {
  name: string;
  consumed: number | null;
  target: number | null;
  unit: string;
  tone: Tone;
  /** Hide the visible status line (the parent explains it once); screen readers still get it. */
  hideHint?: boolean;
  /** Eaten value is a minimum because some logged foods lack this nutrient. */
  consumedIsLowerBound?: boolean;
  /** What's left, from the day summary. Replaces the generic hint when given. */
  remaining?: RemainingDisplay;
};

/** One labelled bar, e.g. "Protein 120 / 150 g". Unknown values render as "—", never 0. */
export function NutrientProgressRow({
  name,
  consumed,
  target,
  unit,
  tone,
  hideHint,
  consumedIsLowerBound,
  remaining,
}: Props) {
  const p = describeNutrientProgress(consumed, target, unit, 0.1, consumedIsLowerBound);
  const overBy = consumed !== null && target !== null ? consumed - target : null;
  const hint = (remaining && describeRemaining(remaining, unit, overBy)) ?? stateHint[p.state];
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground tabular-nums">{p.label}</span>
      </div>
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.percent ?? undefined}
        aria-valuetext={hint ? `${p.label}, ${hint.toLowerCase()}` : p.label}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        {p.percent !== null ? (
          <div
            className={cn("h-full rounded-full transition-all", barTone[tone])}
            style={{ width: `${p.percent}%` }}
          />
        ) : (
          <div className="h-full w-full bg-unknown/30 bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--background)_6px_9px)]" />
        )}
      </div>
      {hint && !hideHint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
