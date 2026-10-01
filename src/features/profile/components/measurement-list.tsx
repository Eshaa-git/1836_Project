"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import { formatLength, formatWeight, round } from "@/server/domain/body/units";
import type { MeasurementView } from "@/server/services/measurements";
import { deleteMeasurementAction } from "../actions";

export function MeasurementList({
  measurements,
  system,
}: {
  measurements: MeasurementView[];
  system: "METRIC" | "IMPERIAL";
}) {
  const router = useRouter();
  const { run, pending } = useAction(deleteMeasurementAction);

  if (!measurements.length) {
    return <p className="text-sm text-muted-foreground">No measurements yet.</p>;
  }

  return (
    <ul className="divide-y">
      {measurements.map((m) => {
        const parts = [
          m.weightKg !== null && formatWeight(m.weightKg, system),
          m.bodyFatPct !== null && `${round(m.bodyFatPct)}% body fat`,
          m.waistCm !== null && `waist ${formatLength(m.waistCm, system)}`,
          m.hipCm !== null && `hips ${formatLength(m.hipCm, system)}`,
          m.chestCm !== null && `chest ${formatLength(m.chestCm, system)}`,
          m.armCm !== null && `arm ${formatLength(m.armCm, system)}`,
          m.thighCm !== null && `thigh ${formatLength(m.thighCm, system)}`,
        ].filter(Boolean);
        return (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{formatDate(m.localDate)}</p>
              <p className="truncate text-sm text-muted-foreground">{parts.join(" · ")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={`Delete measurement from ${formatDate(m.localDate)}`}
              disabled={pending}
              onClick={async () => {
                if ((await run({ id: m.id })).ok) {
                  toast.success("Measurement deleted");
                  router.refresh();
                }
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
