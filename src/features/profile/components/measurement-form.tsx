"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { inToCm, lbToKg, round } from "@/server/domain/body/units";
import { useAction } from "@/lib/use-action";
import { addMeasurementAction } from "../actions";
import { useAfterSave } from "../use-after-save";
import { FormFooter } from "./form-footer";

const LENGTHS = [
  ["waistCm", "Waist"],
  ["hipCm", "Hips"],
  ["chestCm", "Chest"],
  ["armCm", "Upper arm"],
  ["thighCm", "Thigh"],
] as const;

/** Adds a body measurement. Only weight is shown by default; the rest are optional extras. */
export function MeasurementForm({ today, system }: { today: string; system: "METRIC" | "IMPERIAL" }) {
  const { run, pending, fieldErrors, formError } = useAction(addMeasurementAction);
  const afterSave = useAfterSave(undefined, "Measurement added");
  const imperial = system === "IMPERIAL";
  const [values, setValues] = useState<Record<string, string>>({ localDate: today });
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const convert = (key: string, toMetric: (n: number) => number, decimals = 1) =>
      values[key] ? (imperial ? round(toMetric(Number(values[key])), decimals) : values[key]) : "";
    const result = await run({
      localDate: values.localDate,
      weightKg: convert("weightKg", lbToKg, 2),
      bodyFatPct: values.bodyFatPct ?? "",
      ...Object.fromEntries(LENGTHS.map(([key]) => [key, convert(key, inToCm)])),
      note: values.note ?? "",
    });
    if (result.ok) {
      setValues({ localDate: today });
      afterSave();
    }
  }

  const lengthUnit = imperial ? "in" : "cm";
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Date"
          name="localDate"
          type="date"
          max={today}
          value={values.localDate ?? ""}
          onChange={set("localDate")}
          errors={fieldErrors.localDate}
        />
        <FormField
          label={`Weight (${imperial ? "lb" : "kg"})`}
          name="weightKg"
          inputMode="decimal"
          value={values.weightKg ?? ""}
          onChange={set("weightKg")}
          errors={fieldErrors.weightKg}
        />
      </div>
      <details className="group rounded-2xl border p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          More measurements (optional)
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Body fat (%)"
            name="bodyFatPct"
            inputMode="decimal"
            value={values.bodyFatPct ?? ""}
            onChange={set("bodyFatPct")}
            errors={fieldErrors.bodyFatPct}
          />
          {LENGTHS.map(([key, label]) => (
            <FormField
              key={key}
              label={`${label} (${lengthUnit})`}
              name={key}
              inputMode="decimal"
              value={values[key] ?? ""}
              onChange={set(key)}
              errors={fieldErrors[key]}
            />
          ))}
        </div>
      </details>
      <FormFooter error={formError} pending={pending} submitLabel="Add measurement" />
    </form>
  );
}
