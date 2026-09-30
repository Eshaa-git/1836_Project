import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, href = "/today" }: { className?: string; href?: "/" | "/today" }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
      aria-label="Nourish home"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Leaf className="size-4" aria-hidden />
      </span>
      <span className="text-lg">Nourish</span>
    </Link>
  );
}
