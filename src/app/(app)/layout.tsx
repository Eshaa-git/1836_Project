import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { requireSessionOrRedirect } from "@/server/auth/session";
import { getOnboardingStatus } from "@/server/services/profile";

/**
 * Everything under (app) requires a valid session (checked against the
 * database) and a finished setup; new users are sent to onboarding first.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSessionOrRedirect();
  if (!(await getOnboardingStatus(user.id)).completed) redirect("/onboarding");
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
