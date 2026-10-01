import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinishButton } from "@/features/onboarding/components/finish-button";
import { stepHref, type OnboardingStepKey } from "@/features/onboarding/steps";
import { loadProfileForms } from "@/features/profile/data";
import { requireUserContext } from "@/server/auth/session";

export const metadata: Metadata = { title: "You're set" };

export default async function OnboardingDonePage() {
  const ctx = await requireUserContext();
  const { profile, targets, goal } = await loadProfileForms(ctx);
  if (!profile.birthDate) redirect(stepHref("basics"));

  const items: { key: OnboardingStepKey; label: string; done: boolean }[] = [
    { key: "basics", label: "Your basics", done: true },
    { key: "goal", label: "A goal", done: Boolean(goal) },
    {
      key: "food",
      label: "Food preferences & restrictions",
      done: Boolean(profile.dietType || profile.restrictions.length || profile.cuisines.length),
    },
    { key: "routine", label: "Daily routine", done: Boolean(profile.mealsPerDay || profile.wakeTime) },
    { key: "targets", label: "Daily targets", done: Boolean(targets) },
    {
      key: "motivation",
      label: "What motivates you",
      done: Boolean(profile.motivationWhy || profile.roleModel),
    },
  ];

  return (
    <div className="space-y-6 pt-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          You&apos;re all set, {profile.name}
        </h1>
        <p className="text-muted-foreground">
          Anything you skipped can be added from your profile whenever you&apos;re ready.
        </p>
      </div>
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>
            <h2>Your setup</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  {item.done ? (
                    <CircleCheck className="size-5 text-success" aria-label="Done" />
                  ) : (
                    <CircleDashed className="size-5 text-muted-foreground" aria-label="Skipped" />
                  )}
                  {item.label}
                </span>
                {!item.done && (
                  <Link
                    href={stepHref(item.key)}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Add now
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <FinishButton />
    </div>
  );
}
