import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchiveGoalButton } from "@/features/profile/components/archive-goal-button";
import { GoalForm } from "@/features/profile/components/goal-form";
import { GoalStatusCard } from "@/features/profile/components/goal-status-card";
import { ProfileSubpage } from "@/features/profile/components/profile-subpage";
import { loadProfileForms } from "@/features/profile/data";
import { formatMetricValue, toGoalDisplay } from "@/features/profile/goal-display";
import { METRIC_LABELS } from "@/features/profile/labels";
import { formatDate, formatInstant, humanize } from "@/lib/format";
import { requireUserContext } from "@/server/auth/session";
import { getGoalHistory, type GoalEventView, type GoalView } from "@/server/services/goals";

export const metadata: Metadata = { title: "Goal" };

const STATUS_LABEL: Record<GoalView["status"], string> = {
  ACTIVE: "Current",
  ACHIEVED: "Achieved",
  REPLACED: "Replaced",
  ARCHIVED: "Set aside",
};

function describeEvent(e: GoalEventView, goal: GoalView | undefined, system: "METRIC" | "IMPERIAL") {
  switch (e.type) {
    case "CREATED":
      return "Goal created";
    case "ACHIEVED":
      return "Goal achieved — saved as a milestone";
    case "REPLACED":
      return "Replaced by a new goal";
    case "ARCHIVED":
      return "Set aside";
    case "TIMELINE_EXTENDED":
    case "UPDATED": {
      const changes = Object.entries(e.changes ?? {}).map(([field, { from, to }]) => {
        const show = (v: unknown) => {
          if (v === null || v === undefined || v === "") return "none";
          if (field === "targetDate" && typeof v === "string") return formatDate(v);
          if ((field === "targetValue" || field === "startValue") && typeof v === "number" && goal) {
            return formatMetricValue(goal.metric, v, system) ?? String(v);
          }
          if (field === "metric" && typeof v === "string") return METRIC_LABELS[v as GoalView["metric"]];
          if (field === "type" && typeof v === "string") return humanize(v);
          return String(v);
        };
        return `${humanize(field.replace(/([A-Z])/g, "_$1"))}: ${show(from)} → ${show(to)}`;
      });
      return (e.type === "TIMELINE_EXTENDED" ? "Timeline extended. " : "Edited. ") + changes.join("; ");
    }
  }
}

export default async function GoalPage({ searchParams }: PageProps<"/profile/goal">) {
  const { new: wantsNew, edit } = await searchParams;
  const ctx = await requireUserContext();
  const [{ goal, goalState, goalContext, profile }, history] = await Promise.all([
    loadProfileForms(ctx),
    getGoalHistory(ctx.userId),
  ]);
  const system = profile.measurementSystem;
  const goalsById = new Map(history.goals.map((g) => [g.id, g]));

  const historyCard = (history.events.length > 0 || history.milestones.length > 0) && (
    <div className="grid gap-4 md:grid-cols-2">
      {history.milestones.length > 0 && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>
              <h2>Milestones</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {history.milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-3">
                  <Trophy className="mt-0.5 size-5 text-energy" aria-hidden />
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatInstant(m.achievedAt, ctx.timezone)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>
            <h2>Goal history</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {history.events.map((e) => {
              const g = goalsById.get(e.goalId);
              return (
                <li key={e.id} className="space-y-0.5 border-l-2 pl-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {g?.title ?? "Goal"}
                    {g && <Badge variant="secondary">{STATUS_LABEL[g.status]}</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">{describeEvent(e, g, system)}</p>
                  <p className="text-xs text-muted-foreground">{formatInstant(e.createdAt, ctx.timezone)}</p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );

  if (!goal || wantsNew) {
    return (
      <ProfileSubpage
        title={goal ? "Start a new goal" : "Set a goal"}
        description={
          goal ? "Your current goal will be kept in your history." : "Choose what you'd like to work toward."
        }
        aside={historyCard}
      >
        <GoalForm context={goalContext} next="/profile/goal" />
      </ProfileSubpage>
    );
  }

  return (
    <ProfileSubpage
      title="Your goal"
      description="Edit it any time — every change is kept in your history."
      aside={
        <>
          {edit ? null : (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/profile/goal?edit=1">Edit goal</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile/goal?new=1">Start a different goal</Link>
              </Button>
              <ArchiveGoalButton goalId={goal.id} />
            </div>
          )}
          {historyCard}
        </>
      }
    >
      {edit ? (
        <GoalForm initial={goal} context={goalContext} next="/profile/goal" submitLabel="Save changes" />
      ) : (
        goalState && <GoalStatusCard display={toGoalDisplay(goalState, system)} />
      )}
    </ProfileSubpage>
  );
}
