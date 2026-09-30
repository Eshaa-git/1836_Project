"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { safeNextPath, signInSchema } from "@/lib/validation/auth";
import { authErrorMessage, useFormErrors } from "../use-form-errors";
import { FormAlert } from "./form-alert";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const { fieldErrors, formError, setFormError, validate } = useFormErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate(signInSchema, event.currentTarget);
    if (!input) return;
    setPending(true);
    const { error } = await authClient.signIn.email(input);
    if (error) {
      setPending(false);
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace(safeNextPath(next) as "/today");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <FormField label="Email" name="email" type="email" autoComplete="email" errors={fieldErrors.email} />
      <div className="space-y-1.5">
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          errors={fieldErrors.password}
        />
        <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
