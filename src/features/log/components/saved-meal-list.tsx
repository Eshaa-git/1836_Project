"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import type { SavedMealView } from "@/server/services/saved-meals";
import { deleteSavedMealAction, logSavedMealAction } from "../actions";

export function SavedMealList({ meals, date, slot }: { meals: SavedMealView[]; date: string; slot: string }) {
  const router = useRouter();
  const log = useAction(logSavedMealAction);
  const remove = useAction(deleteSavedMealAction);
  if (!meals.length) return null;

  return (
    <ul className="divide-y rounded-3xl border bg-card">
      {meals.map((m) => (
        <li key={m.id} className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{m.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {m.items.map((i) => i.foodName).join(", ")}
              {m.energyKcal !== null && ` · ~${formatNumber(m.energyKcal, 0)} kcal`}
            </p>
          </div>
          <Button
            size="sm"
            disabled={log.pending}
            onClick={async () => {
              const result = await log.run({ savedMealId: m.id, localDate: date, mealSlot: slot });
              if (result.ok) {
                toast.success(`Logged “${m.name}” to ${slot}`);
                router.push(date ? `/meals?date=${date}` : "/meals");
              } else toast.error(result.message);
            }}
          >
            Log
          </Button>
          <Button
            size="icon-lg"
            variant="ghost"
            aria-label={`Delete saved meal ${m.name}`}
            disabled={remove.pending}
            onClick={async () => {
              if ((await remove.run({ savedMealId: m.id })).ok) router.refresh();
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
