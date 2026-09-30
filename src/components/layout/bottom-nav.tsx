"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isActivePath, navItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

const tabClass =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium outline-none focus-visible:bg-muted";

/** Mobile tab bar (below lg). Four primary destinations plus a "More" sheet. */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = navItems.filter((i) => i.primaryMobile);
  const secondary = navItems.filter((i) => !i.primaryMobile);
  const moreActive = secondary.some((i) => isActivePath(pathname, i.href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
    >
      {primary.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(tabClass, active ? "text-primary" : "text-muted-foreground")}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger className={cn(tabClass, moreActive ? "text-primary" : "text-muted-foreground")}>
          <Ellipsis className="size-5" aria-hidden />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Other sections of the app</SheetDescription>
          </SheetHeader>
          <ul className="grid grid-cols-3 gap-2 px-4">
            {secondary.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl p-4 text-sm font-medium",
                      active ? "bg-secondary text-secondary-foreground" : "hover:bg-muted",
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
