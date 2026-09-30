"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/features/auth/components/form-alert";
import { authErrorMessage, useFormErrors } from "@/features/auth/use-form-errors";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema, PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const { fieldErrors, formError, setFormError, validate } = useFormErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate(changePasswordSchema, event.currentTarget);
    if (!input) return;
    setPending(true);
    const { error } = await authClient.changePassword({ ...input, revokeOtherSessions: true });
    setPending(false);
    if (error) return setFormError(authErrorMessage(error));
    formRef.current?.reset();
    toast.success("Password updated. Other devices were signed out.");
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <FormField
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        errors={fieldErrors.currentPassword}
      />
      <FormField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        errors={fieldErrors.newPassword}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
