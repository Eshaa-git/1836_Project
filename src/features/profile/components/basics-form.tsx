"use client";

import type { Route } from "next";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ChoiceChips } from "@/components/common/choice-chips";
import { Field, FieldGroup } from "@/components/common/field";
import { FormField } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import type { SEX_VALUES } from "@/lib/validation/profile";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg, round } from "@/server/domain/body/units";
import { saveBasicsAction } from "../actions";
import { SEX_OPTIONS } from "../labels";
import { useAfterSave } from "../use-after-save";
import { FormFooter } from "./form-footer";

type Sex = (typeof SEX_VALUES)[number];

export type BasicsInitial = {
  name: string;
  birthDate: string | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  measurementSystem: "METRIC" | "IMPERIAL";
  timezone: string;
  exists: boolean;
};

const noopSubscribe = () => () => {};

const toText = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export function BasicsForm({
  initial,
  next,
  submitLabel = "Save",
}: {
  initial: BasicsInitial;
  next?: Route;
  submitLabel?: string;
}) {
  const { run, pending, fieldErrors, formError } = useAction(saveBasicsAction);
  const afterSave = useAfterSave(next, "Your details were saved");

  const [name, setName] = useState(initial.name);
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? "");
  const [sex, setSex] = useState<Sex | null>(initial.sex);
  const [system, setSystem] = useState(initial.measurementSystem);
  const [chosenTimezone, setTimezone] = useState<string | null>(initial.exists ? initial.timezone : null);
  // First-time setup defaults to the browser's timezone (server render keeps the saved value).
  const browserTimezone = useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => initial.timezone,
  );
  const timezone = chosenTimezone ?? browserTimezone;

  const ftIn = initial.heightCm ? cmToFtIn(initial.heightCm) : null;
  const [heightCm, setHeightCm] = useState(toText(initial.heightCm));
  const [heightFt, setHeightFt] = useState(toText(ftIn?.feet));
  const [heightIn, setHeightIn] = useState(toText(ftIn?.inches));
  const [weight, setWeight] = useState(
    toText(
      initial.weightKg === null
        ? null
        : system === "IMPERIAL"
          ? round(kgToLb(initial.weightKg))
          : initial.weightKg,
    ),
  );

  const timezones = useMemo(() => {
    const all = Intl.supportedValuesOf("timeZone");
    return all.includes(timezone) ? all : [timezone, ...all];
  }, [timezone]);

  function switchSystem(to: "METRIC" | "IMPERIAL" | null) {
    if (!to || to === system) return;
    // Convert whatever was typed so switching units never loses input.
    if (to === "IMPERIAL") {
      const cm = Number(heightCm);
      if (heightCm && cm > 0) {
        const { feet, inches } = cmToFtIn(cm);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
      }
      if (weight) setWeight(String(round(kgToLb(Number(weight)))));
    } else {
      if (heightFt) setHeightCm(String(round(ftInToCm(Number(heightFt), Number(heightIn || 0)))));
      if (weight) setWeight(String(round(lbToKg(Number(weight)))));
    }
    setSystem(to);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cm =
      system === "IMPERIAL"
        ? heightFt
          ? round(ftInToCm(Number(heightFt), Number(heightIn || 0)))
          : ""
        : heightCm;
    const kg = weight ? (system === "IMPERIAL" ? round(lbToKg(Number(weight)), 2) : Number(weight)) : "";
    const result = await run({
      name,
      birthDate,
      sex,
      heightCm: cm,
      weightKg: kg,
      measurementSystem: system,
      timezone,
    });
    if (result.ok) afterSave();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormField
        label="What should we call you?"
        name="name"
        autoComplete="given-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        errors={fieldErrors.name}
      />

      <FormField
        label="Date of birth"
        name="birthDate"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        hint="Used for age-appropriate guidance — for example, extra care for under-18s."
        errors={fieldErrors.birthDate}
      />

      <FieldGroup
        legend="Sex"
        optional
        description="Only used to choose sensible safety limits when checking your targets. It's fine to skip."
        errors={fieldErrors.sex}
      >
        <ChoiceChips label="Sex" options={SEX_OPTIONS} value={sex} onChange={setSex} clearable />
      </FieldGroup>

      <FieldGroup legend="Units">
        <ChoiceChips
          label="Units"
          options={[
            { value: "METRIC", label: "Metric (cm, kg)" },
            { value: "IMPERIAL", label: "Imperial (ft, lb)" },
          ]}
          value={system}
          onChange={switchSystem}
        />
      </FieldGroup>

      {system === "METRIC" ? (
        <FormField
          label="Height (cm)"
          name="heightCm"
          inputMode="decimal"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          hint="Used to check that weight goals stay within a healthy range."
          errors={fieldErrors.heightCm}
        />
      ) : (
        <Field
          label="Height"
          hint="Used to check that weight goals stay within a healthy range."
          errors={fieldErrors.heightCm}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                aria-label="Feet"
                inputMode="numeric"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                className="h-11 pr-8 sm:h-10"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                ft
              </span>
            </div>
            <div className="relative flex-1">
              <Input
                aria-label="Inches"
                inputMode="numeric"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                className="h-11 pr-8 sm:h-10"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                in
              </span>
            </div>
          </div>
        </Field>
      )}

      <FormField
        label={`Current weight (${system === "IMPERIAL" ? "lb" : "kg"}) — optional`}
        name="weightKg"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        hint="Your starting point for progress. You can add it later."
        errors={fieldErrors.weightKg}
      />

      <Field
        label="Timezone"
        htmlFor="timezone"
        hint="So “today” matches your day."
        errors={fieldErrors.timezone}
      >
        <NativeSelect id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <FormFooter error={formError} pending={pending} submitLabel={submitLabel} />
    </form>
  );
}
