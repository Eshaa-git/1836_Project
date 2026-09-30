import type { Route } from "next";
import {
  Bot,
  Dumbbell,
  Settings,
  Sun,
  TrendingUp,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  key: string;
  label: string;
  href: Route;
  icon: LucideIcon;
  /** One-line purpose, reused by page headers and empty states. */
  description: string;
  /** Shown in the mobile bottom bar; the rest live under "More". */
  primaryMobile?: boolean;
  group: "main" | "account";
};

export const navItems: readonly NavItem[] = [
  {
    key: "today",
    label: "Today",
    href: "/today",
    icon: Sun,
    description: "What you've done, what remains today, and what to focus on next.",
    primaryMobile: true,
    group: "main",
  },
  {
    key: "coach",
    label: "AI Coach",
    href: "/coach",
    icon: Bot,
    description: "Log food by chatting, ask what to eat next, and get recipes from what you have.",
    primaryMobile: true,
    group: "main",
  },
  {
    key: "meals",
    label: "Meals",
    href: "/meals",
    icon: UtensilsCrossed,
    description: "Log what you ate, reuse saved meals and search your food history.",
    primaryMobile: true,
    group: "main",
  },
  {
    key: "workouts",
    label: "Workouts",
    href: "/workouts",
    icon: Dumbbell,
    description: "Log strength, cardio and mobility sessions and track records.",
    primaryMobile: true,
    group: "main",
  },
  {
    key: "progress",
    label: "Progress",
    href: "/progress",
    icon: TrendingUp,
    description: "Nutrition, hydration, sleep, workouts and body trends over time.",
    group: "main",
  },
  {
    key: "profile",
    label: "Profile",
    href: "/profile",
    icon: User,
    description: "Your details, goals, targets and what motivates you.",
    group: "account",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Reminders, units, privacy and your account.",
    group: "account",
  },
] as const;

export function getNavItem(key: string): NavItem {
  const item = navItems.find((i) => i.key === key);
  if (!item) throw new Error(`Unknown nav item: ${key}`);
  return item;
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
