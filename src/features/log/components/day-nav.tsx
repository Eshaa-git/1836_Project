import type { Route } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { addDays } from "@/server/domain/dates";

export function DayNav({ date, today, basePath }: { date: string; today: string; basePath: "/meals" }) {
  const href = (d: string) => (d === today ? basePath : (`${basePath}?date=${d}` as Route));
  const label = date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : formatDate(date);
  return (
    <nav aria-label="Choose day" className="flex items-center gap-2">
      <Button asChild variant="outline" size="icon-lg" aria-label="Previous day">
        <Link href={href(addDays(date, -1))}>
          <ChevronLeft aria-hidden />
        </Link>
      </Button>
      <p className="min-w-28 text-center font-medium" aria-live="polite">
        {label}
      </p>
      {date < today ? (
        <Button asChild variant="outline" size="icon-lg" aria-label="Next day">
          <Link href={href(addDays(date, 1))}>
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon-lg" aria-label="Next day" disabled>
          <ChevronRight aria-hidden />
        </Button>
      )}
    </nav>
  );
}
