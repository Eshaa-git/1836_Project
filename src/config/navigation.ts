import type { Route } from "next";
import {
  Bot,
  ChefHat,
  Dumbbell,
  Refrigerator,
  Settings,
  ShoppingBasket,
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
    description: "Your meals, nutrition, workout and pantry alerts for today.",
    primaryMobile: true,
    group: "main",
  },
  {
    key: "meals",
    label: "Meals",
    href: "/meals",
    icon: UtensilsCrossed,
    description: "Plan your day or week and log what you actually ate.",
    primaryMobile: true,
    group: "main",
  },
  {
    key: "pantry",
    label: "Pantry",
    href: "/pantry",
    icon: Refrigerator,
    description: "Track what's at home and see what you can make with it.",
    primaryMobile: true,
    group: "main",
  },
  {
    key: "recipes",
    label: "Recipes",
    href: "/recipes",
    icon: ChefHat,
    description: "Recipes filtered for your allergies, diet and goals.",
    group: "main",
  },
  {
    key: "shopping",
    label: "Shopping",
    href: "/shopping",
    icon: ShoppingBasket,
    description: "A grocery list built from your plan minus what you already have.",
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
    description: "Trends, consistency and milestones — are you progressing?",
    group: "main",
  },
  {
    key: "coach",
    label: "AI Coach",
    href: "/coach",
    icon: Bot,
    description: "Ask questions about your meals, pantry, workouts and progress.",
    group: "main",
  },
  {
    key: "profile",
    label: "Profile",
    href: "/profile",
    icon: User,
    description: "Your body measurements, goals and nutrition targets.",
    group: "account",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Preferences, reminders, coaching tone and your account.",
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
