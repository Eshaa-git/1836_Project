"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH, resetPasswordSchema } from "@/lib/validation/auth";
import { authErrorMessage, useFormErrors } from "../use-form-errors";
import { FormAlert } from "./form-alert";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const { fieldErrors, formError, setFormError, validate } = useFormErrors();
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <FormAlert message="This reset link is invalid or has expired." />
        <Button asChild size="lg" className="h-11 w-full text-base">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate(resetPasswordSchema, event.currentTarget);
    if (!input || !token) return;
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: input.password, token });
    if (error) {
      setPending(false);
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace("/login?reset=1");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        errors={fieldErrors.password}
      />
      <FormField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        errors={fieldErrors.confirmPassword}
      />
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
