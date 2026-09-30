"use client";

import { useState } from "react";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { authErrorMessage, useFormErrors } from "../use-form-errors";
import { FormAlert } from "./form-alert";

export function ForgotPasswordForm() {
  const { fieldErrors, formError, setFormError, validate } = useFormErrors();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate(forgotPasswordSchema, event.currentTarget);
    if (!input) return;
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email: input.email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    // Same message whether or not the account exists, so emails can't be probed.
    if (error && error.status === 429) return setFormError(authErrorMessage(error));
    setSent(true);
  }

  if (sent) {
    return (
      <FormAlert
        tone="success"
        message="If an account exists for that email, a reset link is on its way. It works for one hour."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <FormField label="Email" name="email" type="email" autoComplete="email" errors={fieldErrors.email} />
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
