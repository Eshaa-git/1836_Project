"use client";

import { OctagonAlert, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { SafetyIssueView } from "@/lib/use-action";

type Props = {
  issues: SafetyIssueView[];
  acknowledged: string[];
  onAcknowledgedChange: (codes: string[]) => void;
  onApplySuggestion?: (field: string, value: string | number) => void;
};

/**
 * Shows safety-layer results. Blocking issues must be fixed; warnings can be
 * accepted one by one. Nothing here is hidden or auto-dismissed.
 */
export function SafetyReview({ issues, acknowledged, onAcknowledgedChange, onApplySuggestion }: Props) {
  if (!issues.length) return null;
  const blocking = issues.filter((i) => i.severity === "block");
  const warnings = issues.filter((i) => i.severity === "warn");

  return (
    <div className="space-y-3" aria-live="polite">
      {blocking.map((issue) => (
        <div
          key={issue.code}
          role="alert"
          className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <OctagonAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p>{issue.message}</p>
        </div>
      ))}
      {warnings.map((issue) => {
        const id = `ack-${issue.code}`;
        const checked = acknowledged.includes(issue.code);
        return (
          <div
            key={issue.code}
            className="space-y-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm"
          >
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p>{issue.message}</p>
            </div>
            {issue.suggestion && onApplySuggestion && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onApplySuggestion(issue.suggestion!.field, issue.suggestion!.value)}
              >
                {issue.suggestion.label}{" "}
                {issue.suggestion.field.toLowerCase().includes("date") &&
                typeof issue.suggestion.value === "string"
                  ? formatDate(issue.suggestion.value)
                  : issue.suggestion.value}{" "}
                — use this
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) =>
                  onAcknowledgedChange(
                    v ? [...acknowledged, issue.code] : acknowledged.filter((c) => c !== issue.code),
                  )
                }
              />
              <Label htmlFor={id} className="font-normal">
                I understand and want to keep this
              </Label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
