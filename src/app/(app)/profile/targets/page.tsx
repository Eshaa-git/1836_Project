import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileSubpage } from "@/features/profile/components/profile-subpage";
import { TargetsForm } from "@/features/profile/components/targets-form";
import { loadProfileForms } from "@/features/profile/data";
import { formatInstant, formatNumber } from "@/lib/format";
import { requireUserContext } from "@/server/auth/session";
import { listTargetHistory, type TargetsView } from "@/server/services/targets";

export const metadata: Metadata = { title: "Daily targets" };

function summary(t: TargetsView) {
  const parts = [
    t.caloriesKcal !== null && `${formatNumber(t.caloriesKcal)} kcal`,
    t.proteinG !== null && `${formatNumber(t.proteinG)} g protein`,
    t.carbsG !== null && `${formatNumber(t.carbsG)} g carbs`,
    t.fatG !== null && `${formatNumber(t.fatG)} g fat`,
    t.fiberG !== null && `${formatNumber(t.fiberG)} g fiber`,
    t.waterMl !== null && `${formatNumber(t.waterMl)} ml water`,
    t.sleepHours !== null && `${formatNumber(t.sleepHours)} h sleep`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No targets";
}

export default async function TargetsPage() {
  const ctx = await requireUserContext();
  const [{ targets, targetSafety }, history] = await Promise.all([
    loadProfileForms(ctx),
    listTargetHistory(ctx.userId),
  ]);

  return (
    <ProfileSubpage
      title="Daily targets"
      description="Your numbers for each day. Every change is kept, so you can always see what applied when."
      aside={
        history.length > 0 && (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>
                <h2>History</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {history.map((t) => (
                  <li key={t.id} className="space-y-0.5 border-l-2 pl-3">
                    <p className="text-sm font-medium">
                      {formatInstant(t.effectiveFrom, ctx.timezone)} –{" "}
                      {t.effectiveTo ? formatInstant(t.effectiveTo, ctx.timezone) : "now"}
                    </p>
                    <p className="text-sm text-muted-foreground">{summary(t)}</p>
                    {t.reason && <p className="text-xs text-muted-foreground">“{t.reason}”</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )
      }
    >
      <TargetsForm initial={targets ?? {}} safetyContext={targetSafety} />
    </ProfileSubpage>
  );
}
