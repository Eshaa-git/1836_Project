import { CircleAlert, Info, OctagonAlert } from "lucide-react";
import type { FoodFinding } from "@/server/domain/dietary/food-check";
import { cn } from "@/lib/utils";

const STYLE = {
  danger: {
    icon: OctagonAlert,
    box: "border-destructive/40 bg-destructive/10",
    iconClass: "text-destructive",
  },
  warning: { icon: CircleAlert, box: "border-warning/40 bg-warning/10", iconClass: "text-warning" },
  caution: { icon: Info, box: "border-border bg-muted/60", iconClass: "text-muted-foreground" },
} as const;

/** This user's allergy, intolerance, preference and diet findings for a food. */
export function FindingsBox({ findings }: { findings: FoodFinding[] }) {
  if (!findings.length) return null;
  const danger = findings.some((f) => f.level === "danger");
  return (
    <section aria-label="Notes for you" className="space-y-2">
      {danger && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          Not safe for you based on your allergies.
        </p>
      )}
      <ul className="space-y-2">
        {findings.map((f, i) => {
          const s = STYLE[f.level];
          return (
            <li key={i} className={cn("flex gap-2.5 rounded-2xl border p-3 text-sm", s.box)}>
              <s.icon className={cn("mt-0.5 size-4 shrink-0", s.iconClass)} aria-hidden />
              <span>{f.message}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Compact badge for search results. */
export function FindingBadge({ finding }: { finding: FoodFinding | null }) {
  if (!finding) return null;
  const s = STYLE[finding.level];
  const text = finding.level === "danger" ? "Allergen" : finding.level === "warning" ? "Check" : "Note";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        s.box,
      )}
      title={finding.message}
    >
      <s.icon className={cn("size-3", s.iconClass)} aria-hidden />
      {text}
      <span className="sr-only">: {finding.message}</span>
    </span>
  );
}
