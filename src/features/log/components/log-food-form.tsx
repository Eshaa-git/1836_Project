"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { NativeSelect } from "@/components/common/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/features/auth/components/form-alert";
import { PortionCalculator } from "@/features/foods/components/portion-calculator";
import { useAction } from "@/lib/use-action";
import type { FoodPortion } from "@/server/domain/nutrition/food-units";
import type { NutrientProfile } from "@/server/domain/nutrition/nutrients";
import { deleteEntryAction, logFoodAction, updateEntryAction } from "../actions";

type FoodProps = {
  id: string;
  name: string;
  category: string | null;
  portions: FoodPortion[];
  per100g: NutrientProfile;
  isEstimate: boolean;
};

function SlotAndTime({
  slots,
  slot,
  setSlot,
  time,
  setTime,
}: {
  slots: string[];
  slot: string;
  setSlot: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
}) {
  const options = slots.includes(slot) ? slots : [...slots, slot];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Meal" htmlFor="slot">
        <NativeSelect id="slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Time (optional)" htmlFor="time" hint="Eating later than planned is completely fine.">
        <Input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-10"
        />
      </Field>
    </div>
  );
}

/** Log a food that was eaten: amount via the deterministic calculator, then save. */
export function LogFoodForm({
  food,
  date,
  slot: initialSlot,
  slots,
  returnTo,
}: {
  food: FoodProps;
  date: string;
  slot: string;
  slots: string[];
  returnTo: Route;
}) {
  const router = useRouter();
  const { run, pending, formError } = useAction(logFoodAction);
  const [slot, setSlot] = useState(initialSlot);
  const [time, setTime] = useState("");

  return (
    <div className="space-y-5">
      <SlotAndTime slots={slots} slot={slot} setSlot={setSlot} time={time} setTime={setTime} />
      <PortionCalculator
        food={food}
        renderAction={(sel) => (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Button
              size="lg"
              className="h-11 w-full text-base sm:w-auto"
              disabled={!sel.ready || pending}
              onClick={async () => {
                const result = await run({
                  foodId: food.id,
                  localDate: date,
                  mealSlot: slot,
                  quantity: sel.quantityText,
                  amount: sel.amount,
                  eatenTime: time || null,
                });
                if (result.ok) {
                  toast.success(`Added to ${slot}`);
                  router.push(returnTo);
                }
              }}
            >
              {pending ? "Adding…" : `Add to ${slot}`}
            </Button>
          </div>
        )}
      />
    </div>
  );
}

/** Correct or remove a logged entry. Totals recalculate automatically. */
export function EditEntryForm({
  entryId,
  food,
  initialChoice,
  initialQuantity,
  slot: initialSlot,
  initialTime,
  slots,
  returnTo,
}: {
  entryId: string;
  food: FoodProps;
  initialChoice: string;
  initialQuantity: string;
  slot: string;
  initialTime: string;
  slots: string[];
  returnTo: Route;
}) {
  const router = useRouter();
  const update = useAction(updateEntryAction);
  const remove = useAction(deleteEntryAction);
  const [slot, setSlot] = useState(initialSlot);
  const [time, setTime] = useState(initialTime);

  return (
    <div className="space-y-5">
      <SlotAndTime slots={slots} slot={slot} setSlot={setSlot} time={time} setTime={setTime} />
      <PortionCalculator
        food={food}
        initial={{ quantityText: initialQuantity, choice: initialChoice }}
        renderAction={(sel) => (
          <div className="space-y-3">
            <FormAlert message={update.formError ?? remove.formError} />
            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                className="h-11"
                disabled={!sel.ready || update.pending}
                onClick={async () => {
                  const result = await update.run({
                    entryId,
                    mealSlot: slot,
                    quantity: sel.quantityText,
                    amount: sel.amount,
                    eatenTime: time || null,
                  });
                  if (result.ok) {
                    toast.success("Updated");
                    router.push(returnTo);
                  }
                }}
              >
                {update.pending ? "Saving…" : "Save changes"}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="h-11"
                disabled={remove.pending}
                onClick={async () => {
                  if ((await remove.run({ entryId })).ok) {
                    toast.success("Removed");
                    router.push(returnTo);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
