"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { markDayAction } from "../actions";

export function MarkDayButton({ date, complete }: { date: string; complete: boolean }) {
  const router = useRouter();
  const { run, pending } = useAction(markDayAction);
  return (
    <Button
      size="sm"
      variant={complete ? "ghost" : "secondary"}
      disabled={pending}
      onClick={async () => {
        const result = await run({ localDate: date, complete: !complete });
        if (result.ok) {
          if (!complete) toast.success("Marked as fully logged");
          router.refresh();
        }
      }}
    >
      {complete ? "Undo “logged everything”" : "I've logged everything"}
    </Button>
  );
}
