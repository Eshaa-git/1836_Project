import type { Route } from "next";

export const ONBOARDING_STEPS = [
  {
    key: "basics",
    title: "A little about you",
    description: "Just the basics to get started. You can add more detail any time.",
    required: true,
  },
  {
    key: "goal",
    title: "What are you working toward?",
    description: "Pick a goal. You can change it whenever you like.",
    required: false,
  },
  {
    key: "food",
    title: "How you eat",
    description: "Your diet, allergies and preferences — checked before every suggestion.",
    required: false,
  },
  {
    key: "routine",
    title: "Your daily rhythm",
    description: "When you wake, eat, train and sleep, so suggestions fit your day.",
    required: false,
  },
  {
    key: "targets",
    title: "Daily targets",
    description: "Set the numbers you want to track. Leave any blank if you're not sure yet.",
    required: false,
  },
  {
    key: "motivation",
    title: "What keeps you going?",
    description: "Optional — we'll use it to encourage you on harder days.",
    required: false,
  },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export function stepIndex(key: string) {
  return ONBOARDING_STEPS.findIndex((s) => s.key === key);
}

export function stepHref(key: OnboardingStepKey) {
  return `/onboarding/${key}` as Route;
}

/** Where to go after the given step (the summary page after the last one). */
export function nextHref(key: OnboardingStepKey): Route {
  const next = ONBOARDING_STEPS[stepIndex(key) + 1];
  return next ? stepHref(next.key) : ("/onboarding/done" as Route);
}

export function previousHref(key: OnboardingStepKey): Route | null {
  const prev = ONBOARDING_STEPS[stepIndex(key) - 1];
  return prev ? stepHref(prev.key) : null;
}
