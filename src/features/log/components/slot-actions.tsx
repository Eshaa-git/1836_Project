"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Ellipsis, Save } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormAlert } from "@/features/auth/components/form-alert";
import { useAction } from "@/lib/use-action";
import { copyMealAction, markSlotAction, saveMealAction } from "../actions";

/** "Did you skip it, or not log it yet?" — the user decides; we never assume. */
export function SkipPrompt({ date, slot }: { date: string; slot: string }) {
  const router = useRouter();
  const { run, pending } = useAction(markSlotAction);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        if ((await run({ localDate: date, mealSlot: slot, skipped: true })).ok) router.refresh();
      }}
    >
      I skipped it
    </Button>
  );
}

export function UndoSkip({ date, slot }: { date: string; slot: string }) {
  const router = useRouter();
  const { run, pending } = useAction(markSlotAction);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        if ((await run({ localDate: date, mealSlot: slot, skipped: false })).ok) router.refresh();
      }}
    >
      Undo skip
    </Button>
  );
}

/** Per-meal menu: save as a reusable meal, or copy the same meal from the previous day. */
export function SlotMenu({
  date,
  previousDate,
  slot,
  hasEntries,
}: {
  date: string;
  previousDate: string;
  slot: string;
  hasEntries: boolean;
}) {
  const router = useRouter();
  const copy = useAction(copyMealAction);
  const save = useAction(saveMealAction);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState(`My usual ${slot.toLowerCase()}`);

  async function copyFromPrevious() {
    const result = await copy.run({ fromDate: previousDate, fromSlot: slot, toDate: date, toSlot: slot });
    if (result.ok) {
      toast.success(`Copied ${result.value.count} item${result.value.count === 1 ? "" : "s"}`);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label={`More options for ${slot}`}>
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={copyFromPrevious}>
            <Copy aria-hidden /> Copy from the day before
          </DropdownMenuItem>
          {hasEntries && (
            <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
              <Save aria-hidden /> Save as a meal
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await save.run({ name, localDate: date, mealSlot: slot });
              if (result.ok) {
                setSaveOpen(false);
                toast.success(`Saved “${name}”`);
                router.refresh();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Save as a meal</DialogTitle>
              <DialogDescription>Log the same foods again later with one tap.</DialogDescription>
            </DialogHeader>
            <FormAlert message={save.formError} />
            <FormField
              label="Name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              errors={save.fieldErrors.name}
            />
            <DialogFooter>
              <Button type="submit" disabled={save.pending}>
                {save.pending ? "Saving…" : "Save meal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
