"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, navItems, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("size-5", active && "text-sidebar-primary")} aria-hidden />
      {item.label}
    </Link>
  );
}

/** Desktop navigation (lg and up). Mobile uses <BottomNav />. */
export function AppSidebar() {
  const pathname = usePathname();
  const main = navItems.filter((i) => i.group === "main");
  const account = navItems.filter((i) => i.group === "account");

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
      <Brand className="px-2" />
      <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
        {main.map((item) => (
          <SidebarLink key={item.key} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </nav>
      <nav aria-label="Account" className="flex flex-col gap-1 border-t border-sidebar-border pt-4">
        {account.map((item) => (
          <SidebarLink key={item.key} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </nav>
    </aside>
  );
}
