import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import { ONBOARDING_STEPS, stepIndex, type OnboardingStepKey } from "../steps";

export function StepHeader({ step, back }: { step: OnboardingStepKey; back: Route | null }) {
  const index = stepIndex(step);
  const meta = ONBOARDING_STEPS[index]!;
  const percent = Math.round(((index + 1) / ONBOARDING_STEPS.length) * 100);
  return (
    <div className="space-y-4 pt-4 pb-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {back ? (
          <Link href={back} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Link>
        ) : (
          <span />
        )}
        <span>
          Step {index + 1} of {ONBOARDING_STEPS.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{meta.title}</h1>
        <p className="text-muted-foreground">{meta.description}</p>
      </div>
    </div>
  );
}
