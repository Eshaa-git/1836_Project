import type { Metadata, Route } from "next";
import Link from "next/link";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNavItem } from "@/config/navigation";
import { GoalStatusCard } from "@/features/profile/components/goal-status-card";
import { loadProfileForms } from "@/features/profile/data";
import { toGoalDisplay } from "@/features/profile/goal-display";
import { ACTIVITY_OPTIONS, DIET_OPTIONS, RESTRICTION_COPY } from "@/features/profile/labels";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import { requireUserContext } from "@/server/auth/session";
import { formatHeight, formatWeight } from "@/server/domain/body/units";

export const metadata: Metadata = { title: "Profile" };

function Section({
  title,
  href,
  children,
  className,
}: {
  title: string;
  href: Route;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`rounded-3xl ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          Edit <ChevronRight className="size-4" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">
        {value ?? <span className="text-muted-foreground">Not set</span>}
      </span>
    </div>
  );
}

const labelOf = <V extends string>(options: { value: V; label: string }[], value: V | null) =>
  value ? (options.find((o) => o.value === value)?.label ?? null) : null;

export default async function ProfilePage() {
  const ctx = await requireUserContext();
  const { profile, targets, goalState } = await loadProfileForms(ctx);
  const system = profile.measurementSystem;
  const byKind = (kind: keyof typeof RESTRICTION_COPY) => profile.restrictions.filter((r) => r.kind === kind);
  const allergies = byKind("ALLERGY");

  return (
    <div className="space-y-6">
      <PageHeader title={getNavItem("profile").label} description={getNavItem("profile").description} />

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Goal" href="/profile/goal" className="md:col-span-2">
          {goalState ? (
            <GoalStatusCard display={toGoalDisplay(goalState, system)} compact />
          ) : (
            <p className="text-muted-foreground">No goal yet. Setting one helps us tailor suggestions.</p>
          )}
        </Section>

        <Section title="Daily targets" href="/profile/targets">
          {targets ? (
            <>
              <Row
                label="Calories"
                value={targets.caloriesKcal !== null ? `${formatNumber(targets.caloriesKcal)} kcal` : null}
              />
              <Row
                label="Protein"
                value={targets.proteinG !== null ? `${formatNumber(targets.proteinG)} g` : null}
              />
              <Row
                label="Carbs"
                value={targets.carbsG !== null ? `${formatNumber(targets.carbsG)} g` : null}
              />
              <Row label="Fat" value={targets.fatG !== null ? `${formatNumber(targets.fatG)} g` : null} />
              <Row
                label="Fiber"
                value={targets.fiberG !== null ? `${formatNumber(targets.fiberG)} g` : null}
              />
              <Row
                label="Water"
                value={targets.waterMl !== null ? `${formatNumber(targets.waterMl)} ml` : null}
              />
              <Row
                label="Sleep"
                value={targets.sleepHours !== null ? `${formatNumber(targets.sleepHours)} h` : null}
              />
            </>
          ) : (
            <p className="text-muted-foreground">No targets yet.</p>
          )}
        </Section>

        <Section title="Your details" href="/profile/basics">
          <Row label="Name" value={profile.name} />
          <Row label="Age" value={profile.age} />
          <Row
            label="Height"
            value={profile.heightCm !== null ? formatHeight(profile.heightCm, system) : null}
          />
          <Row
            label="Latest weight"
            value={
              profile.latestWeight
                ? `${formatWeight(profile.latestWeight.value, system)} · ${formatDate(profile.latestWeight.localDate, { withYear: false })}`
                : null
            }
          />
          <Row label="Timezone" value={profile.timezone.replaceAll("_", " ")} />
          <Link
            href="/profile/measurements"
            className="inline-block text-primary underline-offset-4 hover:underline"
          >
            Body measurements →
          </Link>
        </Section>

        <Section title="Food & restrictions" href="/profile/food">
          <Row
            label="Diet"
            value={
              profile.dietType === "OTHER" ? profile.dietTypeOther : labelOf(DIET_OPTIONS, profile.dietType)
            }
          />
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldAlert className="size-4 text-destructive" aria-hidden /> Allergies
            </p>
            {allergies.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <li key={a.id}>
                    <Badge variant="destructive">
                      {a.label}
                      {a.severity && a.severity !== "UNKNOWN" && ` · ${a.severity.toLowerCase()}`}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p>None recorded</p>
            )}
          </div>
          {(["INTOLERANCE", "AVOID", "OTHER"] as const).map((kind) => {
            const items = byKind(kind);
            return items.length ? (
              <div key={kind} className="space-y-1.5">
                <p className="text-muted-foreground">{RESTRICTION_COPY[kind].title}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {items.map((r) => (
                    <li key={r.id}>
                      <Badge variant="secondary">{r.label}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })}
          {profile.cuisines.length > 0 && <Row label="Cuisines" value={profile.cuisines.join(", ")} />}
        </Section>

        <Section title="Daily routine" href="/profile/routine">
          <Row label="Activity" value={labelOf(ACTIVITY_OPTIONS, profile.activityLevel)} />
          <Row label="Meals per day" value={profile.mealsPerDay} />
          <Row
            label="Wake / sleep"
            value={
              profile.wakeTime && profile.bedTime
                ? `${formatTime(profile.wakeTime)} – ${formatTime(profile.bedTime)}`
                : null
            }
          />
          <Row
            label="Workouts"
            value={
              profile.workoutDays.length
                ? `${profile.workoutDays.map((d) => d.charAt(0) + d.slice(1).toLowerCase()).join(", ")}${profile.workoutTime ? ` at ${formatTime(profile.workoutTime)}` : ""}`
                : null
            }
          />
          {profile.mealTimes.length > 0 && (
            <p className="text-muted-foreground">
              {profile.mealTimes.map((m) => `${m.label} ${formatTime(m.time)}`).join(" · ")}
            </p>
          )}
        </Section>

        <Section title="Motivation" href="/profile/motivation">
          {profile.motivationWhy ? (
            <p className="italic">“{profile.motivationWhy}”</p>
          ) : (
            <p className="text-muted-foreground">Tell us what got you started — optional.</p>
          )}
          {profile.roleModel && <Row label="Role model" value={profile.roleModel} />}
        </Section>
      </div>
    </div>
  );
}
