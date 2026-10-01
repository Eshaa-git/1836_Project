import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StepHeader } from "@/features/onboarding/components/step-header";
import {
  nextHref,
  ONBOARDING_STEPS,
  previousHref,
  stepHref,
  type OnboardingStepKey,
} from "@/features/onboarding/steps";
import { BasicsForm } from "@/features/profile/components/basics-form";
import { FoodPreferencesForm } from "@/features/profile/components/food-preferences-form";
import { GoalForm } from "@/features/profile/components/goal-form";
import { MotivationForm } from "@/features/profile/components/motivation-form";
import { RoutineForm } from "@/features/profile/components/routine-form";
import { TargetsForm } from "@/features/profile/components/targets-form";
import { loadProfileForms } from "@/features/profile/data";
import { requireUserContext } from "@/server/auth/session";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingStepPage({ params }: PageProps<"/onboarding/[step]">) {
  const { step } = await params;
  const meta = ONBOARDING_STEPS.find((s) => s.key === step);
  if (!meta) notFound();
  const key = meta.key as OnboardingStepKey;

  const ctx = await requireUserContext();
  const data = await loadProfileForms(ctx);
  if (data.profile.onboardingCompleted) redirect("/today");
  if (key !== "basics" && !data.profile.birthDate) redirect(stepHref("basics"));

  const next = nextHref(key);
  const label = key === "motivation" ? "Finish" : "Continue";

  return (
    <>
      <StepHeader step={key} back={previousHref(key)} />
      <Card className="rounded-3xl">
        <CardContent className="pt-2">
          {key === "basics" && <BasicsForm initial={data.basics} next={next} submitLabel={label} />}
          {key === "goal" && (
            <GoalForm initial={data.goal} context={data.goalContext} next={next} submitLabel={label} />
          )}
          {key === "food" && <FoodPreferencesForm initial={data.food} next={next} submitLabel={label} />}
          {key === "routine" && <RoutineForm initial={data.routine} next={next} submitLabel={label} />}
          {key === "targets" && (
            <TargetsForm
              initial={data.targets ?? {}}
              safetyContext={data.targetSafety}
              next={next}
              submitLabel={label}
            />
          )}
          {key === "motivation" && (
            <MotivationForm initial={data.motivation} next={next} submitLabel={label} />
          )}
        </CardContent>
      </Card>
      {!meta.required && (
        <p className="mt-6 text-center">
          <Link href={next} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Skip for now
          </Link>
        </p>
      )}
    </>
  );
}
