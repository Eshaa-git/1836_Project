"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/features/auth/components/form-alert";
import { completeOnboardingAction } from "@/features/profile/actions";
import { useAction } from "@/lib/use-action";

export function FinishButton() {
  const router = useRouter();
  const { run, pending, formError } = useAction(completeOnboardingAction);
  return (
    <div className="space-y-3">
      <FormAlert message={formError} />
      <Button
        size="lg"
        className="h-11 w-full text-base"
        disabled={pending}
        onClick={async () => {
          if ((await run({})).ok) router.replace("/today");
        }}
      >
        {pending ? "One moment…" : "Go to Today"}
      </Button>
    </div>
  );
}
