"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, PartyPopper, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/features/auth/components/form-alert";
import { formatDate, formatNumber } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import type { GoalEvaluation } from "@/server/domain/goals/goals";
import type { GoalView } from "@/server/services/goals";
import { extendGoalAction, markGoalAchievedAction } from "../actions";
import { METRIC_LABELS } from "../labels";

export type GoalDisplay = {
  goal: GoalView;
  current: { value: number; localDate: string } | null;
  evaluation: GoalEvaluation;
  displayValues: {
    start: string | null;
    current: string | null;
    target: string | null;
    remaining: string | null;
  };
};

/** Start → current → target, plus the celebrate / extend prompts of the goal lifecycle. */
export function GoalStatusCard({ display, compact = false }: { display: GoalDisplay; compact?: boolean }) {
  const router = useRouter();
  const { goal, evaluation, displayValues: v } = display;
  const achieve = useAction(markGoalAchievedAction);
  const extend = useAction(extendGoalAction);
  const [celebrated, setCelebrated] = useState(false);

  const fraction = "fraction" in evaluation ? evaluation.fraction : null;

  async function onAchieve() {
    const result = await achieve.run({ goalId: goal.id });
    if (result.ok) {
      setCelebrated(true);
      toast.success("Milestone saved. Well done!");
      router.refresh();
    }
  }

  async function onExtend(targetDate: string) {
    const result = await extend.run({ goalId: goal.id, targetDate, note: "Accepted suggested extension" });
    if (result.ok) {
      toast.success(`New target date: ${formatDate(targetDate)}`);
      router.refresh();
    }
  }

  if (celebrated) {
    return (
      <div className="space-y-3 rounded-2xl bg-secondary p-4">
        <p className="flex items-center gap-2 font-medium">
          <PartyPopper className="size-5 text-primary" aria-hidden /> Saved to your milestones
        </p>
        <p className="text-sm text-muted-foreground">Ready for what&apos;s next?</p>
        <Button asChild>
          <Link href="/profile/goal?new=1">Set your next goal</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-medium">{goal.title}</p>
        <p className="text-sm text-muted-foreground">
          {METRIC_LABELS[goal.metric]}
          {goal.targetDate && <> · by {formatDate(goal.targetDate)}</>}
          {goal.workoutsPerWeek && <> · {goal.workoutsPerWeek} workouts/week</>}
        </p>
      </div>

      {v.target && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Start</p>
              <p className="font-medium tabular-nums">{v.start ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Now</p>
              <p className="font-medium tabular-nums">{v.current ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Target</p>
              <p className="font-medium tabular-nums">{v.target}</p>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label="Goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fraction === null ? undefined : Math.round(fraction * 100)}
            aria-valuetext={
              fraction === null ? "No measurement yet" : `${Math.round(fraction * 100)}% of the way`
            }
            className="h-2.5 overflow-hidden rounded-full bg-muted"
          >
            {fraction !== null && (
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(fraction * 100)}%` }}
              />
            )}
          </div>
          {evaluation.state === "in_progress" && v.remaining && (
            <p className="text-sm text-muted-foreground">
              {formatNumber(evaluation.fraction * 100, 0)}% of the way · {v.remaining} to go
            </p>
          )}
        </div>
      )}

      {evaluation.state === "no_data" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Ruler className="size-4" aria-hidden /> No measurement yet — progress shows once you add one.
          {!compact && (
            <Link href="/profile/measurements" className="text-primary underline-offset-4 hover:underline">
              Add one
            </Link>
          )}
        </p>
      )}

      {evaluation.state === "achieved" && (
        <div className="space-y-3 rounded-2xl bg-secondary p-4">
          <p className="flex items-center gap-2 font-medium">
            <PartyPopper className="size-5 text-primary" aria-hidden /> You&apos;ve reached your target!
          </p>
          <p className="text-sm text-muted-foreground">
            Save it as a milestone — it stays in your history — and then choose what&apos;s next.
          </p>
          <FormAlert message={achieve.formError} />
          <Button onClick={onAchieve} disabled={achieve.pending}>
            {achieve.pending ? "Saving…" : "Celebrate & save milestone"}
          </Button>
        </div>
      )}

      {evaluation.state === "deadline_passed" && (
        <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <p className="flex items-center gap-2 font-medium">
            <CalendarClock className="size-5 text-warning" aria-hidden /> Your target date has passed
          </p>
          <p className="text-sm">
            You&apos;ve come {formatNumber(evaluation.fraction * 100, 0)}% of the way
            {v.remaining && <> with {v.remaining} left</>}. That progress counts. A steady pace would get you
            there by <strong>{formatDate(evaluation.suggestedTargetDate)}</strong> — no need to make anything
            stricter.
          </p>
          <FormAlert message={extend.formError} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onExtend(evaluation.suggestedTargetDate)} disabled={extend.pending}>
              {extend.pending ? "Saving…" : `Extend to ${formatDate(evaluation.suggestedTargetDate)}`}
            </Button>
            {!compact && (
              <Button variant="outline" asChild>
                <Link href="/profile/goal?edit=1">Choose another date</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
