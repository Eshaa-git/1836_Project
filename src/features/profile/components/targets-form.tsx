"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { FormField } from "@/components/common/form-field";
import { SafetyReview } from "@/components/common/safety-review";
import { useAction } from "@/lib/use-action";
import { unacknowledgedWarnings } from "@/server/domain/safety/types";
import {
  checkDailyTargets,
  type DailyTargetsInput,
  type TargetSafetyContext,
} from "@/server/domain/targets/safety";
import { setTargetsAction } from "../actions";
import { useAfterSave } from "../use-after-save";
import { FormFooter } from "./form-footer";

type Key = keyof DailyTargetsInput;

const FIELDS: { key: Key; label: string; unit: string; hint?: string; decimal?: boolean }[] = [
  { key: "caloriesKcal", label: "Calories", unit: "kcal" },
  { key: "proteinG", label: "Protein", unit: "g", decimal: true },
  { key: "carbsG", label: "Carbohydrates", unit: "g", decimal: true },
  { key: "fatG", label: "Fat", unit: "g", decimal: true },
  { key: "fiberG", label: "Fiber", unit: "g", decimal: true, hint: "Many adults aim for 25–38 g." },
  {
    key: "waterMl",
    label: "Water",
    unit: "ml",
    hint: "Includes all drinks. 2,000–3,000 ml suits many adults.",
  },
  { key: "sleepHours", label: "Sleep", unit: "hours", decimal: true, hint: "Most adults need 7–9 hours." },
];

const parse = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function TargetsForm({
  initial,
  safetyContext,
  next,
  submitLabel = "Save targets",
}: {
  initial: Partial<Record<Key, number | null>>;
  safetyContext: TargetSafetyContext;
  next?: Route;
  submitLabel?: string;
}) {
  const { run, pending, fieldErrors, formError, safetyIssues: serverIssues } = useAction(setTargetsAction);
  const afterSave = useAfterSave(next, "Targets saved");
  const [values, setValues] = useState<Record<Key, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, initial[f.key]?.toString() ?? ""])) as Record<Key, string>,
  );
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const parsed = useMemo(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, parse(values[f.key])])) as DailyTargetsInput,
    [values],
  );
  // Same deterministic rules the server enforces, shown live while typing.
  const liveIssues = useMemo(() => checkDailyTargets(parsed, safetyContext), [parsed, safetyContext]);
  const issues = liveIssues.length ? liveIssues : serverIssues;
  const blocked = issues.some((i) => i.severity === "block");
  const needsAck = unacknowledgedWarnings(issues, acknowledged).length > 0;

  const macroKcal =
    parsed.proteinG !== null && parsed.carbsG !== null && parsed.fatG !== null
      ? Math.round(parsed.proteinG * 4 + parsed.carbsG * 4 + parsed.fatG * 9)
      : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run({ ...values, reason, acknowledgedWarnings: acknowledged });
    if (result.ok) {
      setAcknowledged([]);
      setReason("");
      afterSave();
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Fill in only what you want to track. Blank means no target — never zero.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <FormField
            key={f.key}
            label={`${f.label} (${f.unit})`}
            name={f.key}
            inputMode={f.decimal ? "decimal" : "numeric"}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            hint={f.hint}
            errors={fieldErrors[f.key]}
          />
        ))}
      </div>
      {macroKcal !== null && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Your protein, carbs and fat add up to about {macroKcal.toLocaleString()} kcal.
        </p>
      )}
      <FormField
        label="Why are you setting these? (optional)"
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. from my dietitian"
      />
      <SafetyReview issues={issues} acknowledged={acknowledged} onAcknowledgedChange={setAcknowledged} />
      <FormFooter
        error={formError}
        pending={pending}
        disabled={blocked || needsAck}
        submitLabel={
          blocked ? "Adjust the highlighted values" : needsAck ? "Review the notes above" : submitLabel
        }
      />
    </form>
  );
}
