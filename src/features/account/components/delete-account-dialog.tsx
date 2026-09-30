"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormAlert } from "@/features/auth/components/form-alert";
import { authErrorMessage, useFormErrors } from "@/features/auth/use-form-errors";
import { authClient } from "@/lib/auth-client";
import { deleteAccountSchema } from "@/lib/validation/auth";

export function DeleteAccountDialog() {
  const router = useRouter();
  const { fieldErrors, formError, setFormError, validate } = useFormErrors();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate(deleteAccountSchema, event.currentTarget);
    if (!input) return;
    setPending(true);
    const { error } = await authClient.deleteUser({ password: input.password });
    if (error) {
      setPending(false);
      return setFormError(authErrorMessage(error));
    }
    toast.success("Your account and personal data have been deleted.");
    router.replace("/");
    router.refresh();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="lg">
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile, goals, food and workout logs and everything else
              you&apos;ve recorded. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <FormAlert message={formError} />
          <FormField
            label="Your password"
            name="password"
            type="password"
            autoComplete="current-password"
            errors={fieldErrors.password}
          />
          <FormField
            label="Type DELETE to confirm"
            name="confirmation"
            autoComplete="off"
            errors={fieldErrors.confirmation}
          />
          <DialogFooter>
            <Button type="submit" variant="destructive" size="lg" disabled={pending}>
              {pending ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
