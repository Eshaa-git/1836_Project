"use client";

import type { Route } from "next";
import { useState } from "react";
import { Field } from "@/components/common/field";
import { FormField } from "@/components/common/form-field";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/lib/use-action";
import { saveMotivationAction } from "../actions";
import { useAfterSave } from "../use-after-save";
import { FormFooter } from "./form-footer";

export function MotivationForm({
  initial,
  next,
  submitLabel = "Save",
}: {
  initial: { motivationWhy: string | null; roleModel: string | null };
  next?: Route;
  submitLabel?: string;
}) {
  const { run, pending, fieldErrors, formError } = useAction(saveMotivationAction);
  const afterSave = useAfterSave(next, "Saved");
  const [why, setWhy] = useState(initial.motivationWhy ?? "");
  const [roleModel, setRoleModel] = useState(initial.roleModel ?? "");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run({ motivationWhy: why, roleModel });
    if (result.ok) afterSave();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Field
        label="Who or what got you started?"
        htmlFor="why"
        optional
        hint="We'll remind you of this on harder days."
        errors={fieldErrors.motivationWhy}
      >
        <Textarea
          id="why"
          value={why}
          maxLength={500}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="e.g. I want to keep up with my kids, and feel strong again."
          className="min-h-28"
        />
      </Field>
      <FormField
        label="A role model who inspires you (optional)"
        name="roleModel"
        value={roleModel}
        onChange={(e) => setRoleModel(e.target.value)}
        placeholder="e.g. an athlete, coach or someone you know"
        hint="We only share habits that are publicly documented — never guesses about someone's private routine."
        errors={fieldErrors.roleModel}
      />
      <FormFooter error={formError} pending={pending} submitLabel={submitLabel} />
    </form>
  );
}
