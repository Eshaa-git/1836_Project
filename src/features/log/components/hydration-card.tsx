"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Droplet, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { NutrientProgressRow } from "@/components/common/nutrient-progress-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import type { HydrationDay } from "@/server/services/wellness-logs";
import { addWaterAction, deleteWaterAction } from "../actions";

/** Water: target → drunk → remaining, with one-tap logging. */
export function HydrationCard({
  date,
  day,
  targetMl,
}: {
  date: string;
  day: HydrationDay;
  targetMl: number | null;
}) {
  const router = useRouter();
  const add = useAction(addWaterAction);
  const undo = useAction(deleteWaterAction);
  const [custom, setCustom] = useState("");
  const last = day.entries.at(-1);

  async function log(amountMl: number | string) {
    const result = await add.run({ localDate: date, amountMl, drink: "Water" });
    if (result.ok) {
      setCustom("");
      router.refresh();
    } else toast.error(result.message);
  }

  const remaining =
    targetMl === null
      ? undefined
      : day.totalMl === null
        ? ({ status: "unknown" } as const)
        : ({
            status: "exact",
            value: Math.max(0, targetMl - day.totalMl),
            over: day.totalMl > targetMl,
          } as const);

  return (
    <div className="space-y-3">
      <NutrientProgressRow
        name="Water"
        unit="ml"
        tone="water"
        consumed={day.totalMl}
        target={targetMl}
        remaining={remaining}
      />
      <div className="flex flex-wrap items-center gap-2">
        {[250, 500].map((ml) => (
          <Button key={ml} size="sm" variant="secondary" disabled={add.pending} onClick={() => log(ml)}>
            <Droplet aria-hidden /> +{ml} ml
          </Button>
        ))}
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom) void log(custom);
          }}
        >
          <Input
            aria-label="Other amount in ml"
            inputMode="numeric"
            placeholder="ml"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-8 w-20"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!custom || add.pending}>
            Add
          </Button>
        </form>
        {last && (
          <Button
            size="sm"
            variant="ghost"
            disabled={undo.pending}
            onClick={async () => {
              if ((await undo.run({ id: last.id })).ok) router.refresh();
            }}
          >
            <Undo2 aria-hidden /> Undo {last.amountMl} ml
          </Button>
        )}
      </div>
    </div>
  );
}
