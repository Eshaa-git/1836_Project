"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { archiveGoalAction } from "../actions";

export function ArchiveGoalButton({ goalId }: { goalId: string }) {
  const router = useRouter();
  const { run, pending } = useAction(archiveGoalAction);
  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        if ((await run({ goalId })).ok) {
          toast.success("Goal set aside. It stays in your history.");
          router.refresh();
        }
      }}
    >
      Set this goal aside
    </Button>
  );
}
