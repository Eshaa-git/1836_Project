import { AppShell } from "@/components/layout/app-shell";
import { requireSessionOrRedirect } from "@/server/auth/session";

/** Everything under (app) requires a valid session (checked against the database). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSessionOrRedirect();
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
