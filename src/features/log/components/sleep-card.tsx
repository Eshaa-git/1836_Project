"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { NutrientProgressRow } from "@/components/common/nutrient-progress-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import type { SleepView } from "@/server/services/wellness-logs";
import { saveSleepAction } from "../actions";

const hours = (min: number) => `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;

/** Last night's sleep. Not logged means unknown — never zero hours. */
export function SleepCard({
  date,
  sleep,
  targetHours,
  defaults,
}: {
  date: string;
  sleep: SleepView | null;
  targetHours: number | null;
  defaults: { bedtime: string; wakeTime: string };
}) {
  const router = useRouter();
  const { run, pending, fieldErrors } = useAction(saveSleepAction);
  const [editing, setEditing] = useState(!sleep);
  const [bedtime, setBedtime] = useState(defaults.bedtime);
  const [wakeTime, setWakeTime] = useState(defaults.wakeTime);
  const sleptHours = sleep ? Math.round((sleep.durationMin / 60) * 10) / 10 : null;

  return (
    <div className="space-y-3">
      <NutrientProgressRow
        name="Sleep"
        unit="h"
        tone="sleep"
        consumed={sleptHours}
        target={targetHours}
        hideHint={!sleep}
      />
      {sleep && !editing && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Last night: {hours(sleep.durationMin)}</span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      )}
      {editing && (
        <form
          className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await run({ localDate: date, bedtime, wakeTime, quality: null });
            if (result.ok) {
              setEditing(false);
              toast.success("Sleep saved");
              router.refresh();
            }
          }}
        >
          <Field label="Went to bed" htmlFor="bedtime" errors={fieldErrors.bedtime}>
            <Input
              id="bedtime"
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="h-9"
            />
          </Field>
          <Field label="Woke up" htmlFor="waketime" errors={fieldErrors.wakeTime}>
            <Input
              id="waketime"
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="h-9"
            />
          </Field>
          <Button type="submit" size="sm" className="mb-0.5" disabled={pending}>
            Save
          </Button>
        </form>
      )}
    </div>
  );
}
