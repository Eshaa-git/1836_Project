"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH, signUpSchema } from "@/lib/validation/auth";
import { authErrorMessage, useFormErrors } from "../use-form-errors";
import { FormAlert } from "./form-alert";

export function SignUpForm() {
  const router = useRouter();
  const { fieldErrors, formError, setFormError, validate } = useFormErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate(signUpSchema, event.currentTarget);
    if (!input) return;
    setPending(true);
    const { error } = await authClient.signUp.email(input);
    if (error) {
      setPending(false);
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace("/today");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <FormField label="Name" name="name" autoComplete="given-name" errors={fieldErrors.name} />
      <FormField label="Email" name="email" type="email" autoComplete="email" errors={fieldErrors.email} />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short phrase is easy to remember.`}
        errors={fieldErrors.password}
      />
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
