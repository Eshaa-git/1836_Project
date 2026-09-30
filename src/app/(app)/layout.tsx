import { AppShell } from "@/components/layout/app-shell";

// Phase 1 adds the authentication check here (redirect to /login when signed out).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
