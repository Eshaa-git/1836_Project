import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { requireSessionOrRedirect } from "@/server/auth/session";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireSessionOrRedirect();
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      <header className="flex h-16 items-center justify-between">
        <Brand href="/today" />
        <ThemeToggle />
      </header>
      <main className="flex-1 pb-16">{children}</main>
    </div>
  );
}
