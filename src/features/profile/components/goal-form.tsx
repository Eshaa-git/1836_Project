"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { ChoiceChips } from "@/components/common/choice-chips";
import { Field, FieldGroup } from "@/components/common/field";
import { FormField } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SafetyReview } from "@/components/common/safety-review";
import { useAction } from "@/lib/use-action";
import type { GOAL_METRICS, GOAL_TYPES } from "@/lib/validation/profile";
import { cmToIn, inToCm, kgToLb, lbToKg, round } from "@/server/domain/body/units";
import { addDays } from "@/server/domain/dates";
import { checkGoalPlan, expectedDirection, METRICS_FOR_GOAL } from "@/server/domain/goals/goals";
import { unacknowledgedWarnings } from "@/server/domain/safety/types";
import { createGoalAction, updateGoalAction } from "../actions";
import { GOAL_OPTIONS, METRIC_LABELS } from "../labels";
import { useAfterSave } from "../use-after-save";
import { FormFooter } from "./form-footer";

type GoalType = (typeof GOAL_TYPES)[number];
type Metric = (typeof GOAL_METRICS)[number];

export type GoalFormContext = {
  today: string;
  system: "METRIC" | "IMPERIAL";
  heightCm: number | null;
  age: number | null;
  /** Latest recorded value per metric (metric units), or null if never measured. */
  latest: Partial<Record<Metric, number | null>>;
};

export type GoalInitial = {
  id: string;
  type: GoalType;
  metric: Metric;
  title: string;
  startValue: number | null;
  targetValue: number | null;
  startDate: string;
  targetDate: string | null;
  workoutsPerWeek: number | null;
};

// Display ↔ stored units for each metric.
function unitFor(metric: Metric, system: "METRIC" | "IMPERIAL") {
  if (metric === "BODY_WEIGHT_KG") return system === "IMPERIAL" ? "lb" : "kg";
  if (metric === "WAIST_CM") return system === "IMPERIAL" ? "in" : "cm";
  if (metric === "BODY_FAT_PCT") return "%";
  return "";
}
function toDisplay(metric: Metric, system: "METRIC" | "IMPERIAL", value: number | null) {
  if (value === null) return "";
  if (system === "IMPERIAL" && metric === "BODY_WEIGHT_KG") return String(round(kgToLb(value)));
  if (system === "IMPERIAL" && metric === "WAIST_CM") return String(round(cmToIn(value)));
  return String(value);
}
function toStored(metric: Metric, system: "METRIC" | "IMPERIAL", text: string): number | null {
  if (text.trim() === "" || Number.isNaN(Number(text))) return null;
  const n = Number(text);
  if (system === "IMPERIAL" && metric === "BODY_WEIGHT_KG") return round(lbToKg(n), 2);
  if (system === "IMPERIAL" && metric === "WAIST_CM") return round(inToCm(n), 1);
  return n;
}

export function GoalForm({
  initial,
  context,
  next,
  submitLabel,
}: {
  initial?: GoalInitial;
  context: GoalFormContext;
  next?: Route;
  submitLabel?: string;
}) {
  const editing = Boolean(initial);
  const create = useAction(createGoalAction);
  const update = useAction(updateGoalAction);
  const { run, pending, fieldErrors, formError, safetyIssues: serverIssues } = editing ? update : create;
  const afterSave = useAfterSave(next, editing ? "Goal updated" : "Goal saved");
  const { system } = context;

  const [type, setType] = useState<GoalType | null>(initial?.type ?? null);
  const [metric, setMetric] = useState<Metric>(initial?.metric ?? "NONE");
  const [target, setTarget] = useState(toDisplay(metric, system, initial?.targetValue ?? null));
  const [start, setStart] = useState("");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [workouts, setWorkouts] = useState(initial?.workoutsPerWeek ? String(initial.workoutsPerWeek) : "");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const metrics = type ? METRICS_FOR_GOAL[type] : [];
  const numeric = metric !== "NONE" && metric !== "WORKOUTS_PER_WEEK";
  const measured =
    editing && initial!.metric === metric ? initial!.startValue : (context.latest[metric] ?? null);
  const unit = unitFor(metric, system);

  // Until the user picks a measure themselves, follow the goal type's natural default.
  const [metricChosen, setMetricChosen] = useState(editing);

  function chooseType(next: GoalType | null) {
    setType(next);
    if (!next) return;
    const allowed = METRICS_FOR_GOAL[next];
    if (!metricChosen || !allowed.includes(metric)) {
      setMetric(allowed[0]!);
      setTarget("");
    }
  }

  const plan = useMemo(
    () =>
      type && {
        type,
        metric,
        startValue: numeric ? (measured ?? toStored(metric, system, start)) : null,
        targetValue: numeric ? toStored(metric, system, target) : null,
        startDate: initial?.startDate ?? context.today,
        targetDate: targetDate || null,
      },
    [type, metric, numeric, measured, start, target, targetDate, system, initial, context.today],
  );
  const liveIssues = useMemo(
    () => (plan ? checkGoalPlan(plan, { heightCm: context.heightCm, age: context.age }) : []),
    [plan, context.heightCm, context.age],
  );
  const issues = liveIssues.length ? liveIssues : serverIssues;
  const blocked = issues.some((i) => i.severity === "block");
  const needsAck = unacknowledgedWarnings(issues, acknowledged).length > 0;
  const direction = type ? expectedDirection(type, metric) : "none";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!type) return;
    const payload = {
      type,
      metric,
      startValue: numeric && measured === null ? (toStored(metric, system, start) ?? "") : "",
      targetValue: numeric ? (toStored(metric, system, target) ?? "") : "",
      targetDate,
      workoutsPerWeek: workouts,
      acknowledgedWarnings: acknowledged,
    };
    const result = await run(editing ? { goalId: initial!.id, ...payload } : payload);
    if (result.ok) afterSave();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup legend="What do you want to work toward?" errors={fieldErrors.type}>
        <ChoiceChips label="Goal" variant="cards" options={GOAL_OPTIONS} value={type} onChange={chooseType} />
      </FieldGroup>

      {type && metrics.length > 1 && (
        <Field label="How will you measure it?" htmlFor="metric" errors={fieldErrors.metric}>
          <NativeSelect
            id="metric"
            value={metric}
            onChange={(e) => {
              setMetric(e.target.value as Metric);
              setMetricChosen(true);
              setTarget("");
            }}
          >
            {metrics.map((m) => (
              <option key={m} value={m}>
                {METRIC_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      {type && numeric && (
        <div className="grid gap-4 sm:grid-cols-2">
          {measured !== null ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Starting point</p>
              <p className="flex h-10 items-center rounded-lg bg-muted px-3 text-sm">
                {toDisplay(metric, system, measured)} {unit}
              </p>
            </div>
          ) : (
            <FormField
              label={`Where you are now (${unit})`}
              name="startValue"
              inputMode="decimal"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              errors={fieldErrors.startValue}
            />
          )}
          <FormField
            label={`Target (${unit})`}
            name="targetValue"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            hint={direction === "hold" ? "The value you'd like to stay around." : undefined}
            errors={fieldErrors.targetValue}
          />
        </div>
      )}

      {type && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Target date (optional)"
            name="targetDate"
            type="date"
            min={addDays(context.today, 7)}
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            hint="You can change this any time."
            errors={fieldErrors.targetDate}
          />
          <FormField
            label="Workouts per week (optional)"
            name="workoutsPerWeek"
            inputMode="numeric"
            value={workouts}
            onChange={(e) => setWorkouts(e.target.value)}
            hint="An activity goal to go with it."
            errors={fieldErrors.workoutsPerWeek}
          />
        </div>
      )}

      <SafetyReview
        issues={issues}
        acknowledged={acknowledged}
        onAcknowledgedChange={setAcknowledged}
        onApplySuggestion={(field, value) => {
          if (field === "targetDate") setTargetDate(String(value));
        }}
      />

      <FormFooter
        error={formError}
        pending={pending}
        disabled={!type || blocked || needsAck}
        submitLabel={
          blocked
            ? "Adjust the goal above"
            : needsAck
              ? "Review the notes above"
              : (submitLabel ?? "Save goal")
        }
      />
    </form>
  );
}
