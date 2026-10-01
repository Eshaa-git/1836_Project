import { redirect } from "next/navigation";
import { stepHref } from "@/features/onboarding/steps";
import { requireSessionOrRedirect } from "@/server/auth/session";
import { getOnboardingStatus } from "@/server/services/profile";

export default async function OnboardingIndex() {
  const { user } = await requireSessionOrRedirect();
  const status = await getOnboardingStatus(user.id);
  if (status.completed) redirect("/today");
  redirect(stepHref(status.hasBasics ? "goal" : "basics"));
}
