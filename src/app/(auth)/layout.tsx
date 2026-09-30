import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getSession } from "@/server/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/today");

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 lg:px-8">
      <header className="flex h-16 items-center justify-between">
        <Brand href="/" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
