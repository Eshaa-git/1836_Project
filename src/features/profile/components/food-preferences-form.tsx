"use client";

import type { Route } from "next";
import { useState } from "react";
import { CircleAlert, Plus, X } from "lucide-react";
import { ChoiceChips } from "@/components/common/choice-chips";
import { FieldGroup } from "@/components/common/field";
import { FormField } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { TagInput } from "@/components/common/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { CUISINES, type ALLERGY_SEVERITIES, type DIET_TYPES } from "@/lib/validation/profile";
import {
  ALLERGENS,
  getAllergen,
  suggestAllergenCodes,
  type AllergenCode,
} from "@/server/domain/dietary/allergens";
import { saveFoodPreferencesAction } from "../actions";
import { DIET_OPTIONS, RESTRICTION_COPY, SEVERITY_OPTIONS } from "../labels";
import { useAfterSave } from "../use-after-save";
import { FormFooter } from "./form-footer";

type DietType = (typeof DIET_TYPES)[number];
type Severity = (typeof ALLERGY_SEVERITIES)[number];
type Allergy = { label: string; allergenCode: AllergenCode | null; severity: Severity };
type RestrictionKind = "ALLERGY" | "INTOLERANCE" | "AVOID" | "OTHER";

export type FoodPreferencesInitial = {
  dietType: DietType | null;
  dietTypeOther: string | null;
  cuisines: string[];
  preferredFoods: string[];
  restrictions: {
    kind: RestrictionKind;
    label: string;
    allergenCode: string | null;
    severity: Severity | null;
  }[];
};

const INTOLERANCE_SUGGESTIONS = ["Lactose", "Gluten", "FODMAPs", "Fructose", "Caffeine", "Histamine"];
const AVOID_SUGGESTIONS = ["Mushrooms", "Okra", "Eggplant", "Coriander", "Very spicy food"];
const OTHER_SUGGESTIONS = [
  "Halal",
  "Kosher",
  "No beef",
  "No pork",
  "Jain",
  "No onion or garlic",
  "No alcohol",
];

export function FoodPreferencesForm({
  initial,
  next,
  submitLabel = "Save",
}: {
  initial: FoodPreferencesInitial;
  next?: Route;
  submitLabel?: string;
}) {
  const { run, pending, fieldErrors, formError } = useAction(saveFoodPreferencesAction);
  const afterSave = useAfterSave(next, "Food preferences saved");

  const labelsOf = (kind: RestrictionKind) =>
    initial.restrictions.filter((r) => r.kind === kind).map((r) => r.label);
  const [dietType, setDietType] = useState<DietType | null>(initial.dietType);
  const [dietTypeOther, setDietTypeOther] = useState(initial.dietTypeOther ?? "");
  const [cuisines, setCuisines] = useState(initial.cuisines);
  const [preferredFoods, setPreferredFoods] = useState(initial.preferredFoods);
  const [allergies, setAllergies] = useState<Allergy[]>(
    initial.restrictions
      .filter((r) => r.kind === "ALLERGY")
      .map((r) => ({
        label: r.label,
        allergenCode: (r.allergenCode as AllergenCode | null) ?? null,
        severity: r.severity ?? "UNKNOWN",
      })),
  );
  const [intolerances, setIntolerances] = useState(labelsOf("INTOLERANCE"));
  const [avoid, setAvoid] = useState(labelsOf("AVOID"));
  const [other, setOther] = useState(labelsOf("OTHER"));
  const [customAllergy, setCustomAllergy] = useState("");

  const listedCuisines = CUISINES as readonly string[];
  const customCuisines = cuisines.filter((c) => !listedCuisines.includes(c));

  function toggleAllergen(code: AllergenCode) {
    const existing = allergies.find((a) => a.allergenCode === code);
    if (existing) setAllergies(allergies.filter((a) => a !== existing));
    else
      setAllergies([
        ...allergies,
        { label: getAllergen(code).label, allergenCode: code, severity: "UNKNOWN" },
      ]);
  }

  function addCustomAllergy() {
    const label = customAllergy.trim();
    if (!label || allergies.some((a) => a.label.toLowerCase() === label.toLowerCase())) return;
    const [code = null] = suggestAllergenCodes(label);
    setAllergies([...allergies, { label, allergenCode: code, severity: "UNKNOWN" }]);
    setCustomAllergy("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const codeFor = (label: string) => suggestAllergenCodes(label)[0] ?? null;
    const result = await run({
      dietType,
      dietTypeOther,
      cuisines,
      preferredFoods,
      restrictions: [
        ...allergies.map((a) => ({ kind: "ALLERGY", ...a })),
        ...intolerances.map((label) => ({ kind: "INTOLERANCE", label, allergenCode: codeFor(label) })),
        ...avoid.map((label) => ({ kind: "AVOID", label })),
        ...other.map((label) => ({ kind: "OTHER", label })),
      ],
    });
    if (result.ok) afterSave();
  }

  const restrictionError = Object.entries(fieldErrors).find(([k]) => k.startsWith("restrictions"))?.[1];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <FieldGroup legend="How do you eat?" optional errors={fieldErrors.dietType}>
        <ChoiceChips
          label="Diet type"
          options={DIET_OPTIONS}
          value={dietType}
          onChange={setDietType}
          clearable
        />
        {dietType === "OTHER" && (
          <FormField
            label="Describe it"
            name="dietTypeOther"
            value={dietTypeOther}
            onChange={(e) => setDietTypeOther(e.target.value)}
            placeholder="e.g. keto, flexitarian"
            errors={fieldErrors.dietTypeOther}
          />
        )}
      </FieldGroup>

      {/* Allergies: highest priority, strictly excluded. */}
      <section
        aria-labelledby="allergies-heading"
        className="space-y-3 rounded-3xl border border-destructive/25 p-4"
      >
        <div>
          <h3 id="allergies-heading" className="font-medium">
            {RESTRICTION_COPY.ALLERGY.title}
          </h3>
          <p className="text-sm text-muted-foreground">{RESTRICTION_COPY.ALLERGY.description}</p>
        </div>
        <ChoiceChips
          label="Common allergens"
          multiple
          options={ALLERGENS.map((a) => ({ value: a.code, label: a.label }))}
          value={allergies.flatMap((a) => (a.allergenCode ? [a.allergenCode] : []))}
          onChange={(codes) => {
            const added = codes.find((c) => !allergies.some((a) => a.allergenCode === c));
            const removed = allergies.find((a) => a.allergenCode && !codes.includes(a.allergenCode));
            if (added) toggleAllergen(added);
            else if (removed?.allergenCode) toggleAllergen(removed.allergenCode);
          }}
        />
        <div className="flex gap-2">
          <Input
            aria-label="Add another allergy"
            placeholder="Something else? e.g. kiwi"
            value={customAllergy}
            onChange={(e) => setCustomAllergy(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomAllergy();
              }
            }}
            className="h-10"
          />
          <Button type="button" variant="outline" size="lg" className="h-10" onClick={addCustomAllergy}>
            <Plus aria-hidden /> Add
          </Button>
        </div>
        {allergies.length > 0 && (
          <ul className="space-y-2" aria-label="Your allergies">
            {allergies.map((a) => (
              <li key={a.label} className="space-y-2 rounded-2xl bg-muted/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{a.label}</p>
                    {a.allergenCode ? (
                      <p className="text-xs text-muted-foreground">
                        Includes: {getAllergen(a.allergenCode).includes.slice(0, 4).join(", ")}
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-warning">
                        <CircleAlert className="size-3.5" aria-hidden /> Not a standard allergen — we&apos;ll
                        match it by name. Always check ingredient labels.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <NativeSelect
                      aria-label={`Severity of ${a.label} allergy`}
                      value={a.severity}
                      onChange={(e) =>
                        setAllergies(
                          allergies.map((x) =>
                            x === a ? { ...x, severity: e.target.value as Severity } : x,
                          ),
                        )
                      }
                      className="h-9 w-32"
                    >
                      {SEVERITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Remove ${a.label}`}
                      onClick={() => setAllergies(allergies.filter((x) => x !== a))}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FieldGroup
        legend={RESTRICTION_COPY.INTOLERANCE.title}
        description={RESTRICTION_COPY.INTOLERANCE.description}
      >
        <TagInput
          label="Intolerances"
          value={intolerances}
          onChange={setIntolerances}
          placeholder="e.g. lactose"
          suggestions={INTOLERANCE_SUGGESTIONS}
        />
      </FieldGroup>

      <FieldGroup legend={RESTRICTION_COPY.AVOID.title} description={RESTRICTION_COPY.AVOID.description}>
        <TagInput
          label="Foods you avoid"
          value={avoid}
          onChange={setAvoid}
          placeholder="e.g. mushrooms"
          suggestions={AVOID_SUGGESTIONS}
        />
      </FieldGroup>

      <FieldGroup legend={RESTRICTION_COPY.OTHER.title} description={RESTRICTION_COPY.OTHER.description}>
        <TagInput
          label="Other restrictions"
          value={other}
          onChange={setOther}
          placeholder="e.g. halal"
          suggestions={OTHER_SUGGESTIONS}
        />
      </FieldGroup>

      {restrictionError && (
        <p role="alert" className="text-sm text-destructive">
          {restrictionError[0]}
        </p>
      )}

      <FieldGroup legend="Cuisines you enjoy" optional>
        <ChoiceChips
          label="Cuisines"
          multiple
          options={CUISINES.map((c) => ({ value: c, label: c }))}
          value={cuisines.filter((c) => listedCuisines.includes(c))}
          onChange={(listed) => setCuisines([...listed, ...customCuisines])}
        />
        <TagInput
          label="Other cuisines"
          value={customCuisines}
          onChange={(custom) =>
            setCuisines([...cuisines.filter((c) => listedCuisines.includes(c)), ...custom])
          }
          placeholder="Another cuisine"
        />
      </FieldGroup>

      <FieldGroup legend="Foods you love" optional description="We'll lean on these when suggesting meals.">
        <TagInput
          label="Preferred foods"
          value={preferredFoods}
          onChange={setPreferredFoods}
          placeholder="e.g. dosa, paneer, chickpeas"
        />
      </FieldGroup>

      <FormFooter error={formError} pending={pending} submitLabel={submitLabel} />
    </form>
  );
}
