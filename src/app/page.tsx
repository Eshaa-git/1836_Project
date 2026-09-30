import Link from "next/link";
import { ChefHat, Dumbbell, Refrigerator, TrendingUp } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

const pillars = [
  { icon: ChefHat, title: "What should I eat?", body: "Meals that fit your targets, diet and allergies." },
  { icon: Refrigerator, title: "What can I make?", body: "Recipes from what's already in your kitchen." },
  { icon: Dumbbell, title: "How should I move?", body: "Log workouts and watch your records improve." },
  { icon: TrendingUp, title: "Am I progressing?", body: "Honest trends — no guesses when data is missing." },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 lg:px-8">
      <header className="flex h-16 items-center justify-between">
        <Brand href="/" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-12 py-12">
        <section className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Eat well from the kitchen you already have.
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            Nourish connects your goals, pantry, meals and workouts into one simple daily plan — and adjusts
            it as you go.
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Points at the app directly until sign-up exists (Phase 1). */}
            <Button asChild size="lg" className="h-11 px-5 text-base">
              <Link href="/today">Get started</Link>
            </Button>
          </div>
        </section>

        <ul className="grid gap-4 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4 rounded-3xl border bg-card p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
