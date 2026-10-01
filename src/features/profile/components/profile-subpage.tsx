import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Shared frame for profile edit pages: back link, heading and a card. */
export function ProfileSubpage({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Extra content below the main card (history, lists). */
  aside?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Profile
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="max-w-prose text-muted-foreground">{description}</p>}
      </div>
      <Card className="rounded-3xl">
        <CardContent className="pt-2">{children}</CardContent>
      </Card>
      {aside}
    </div>
  );
}
