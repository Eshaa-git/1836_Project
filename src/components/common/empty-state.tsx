import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "lg";
};

/**
 * Friendly placeholder for "nothing here yet". Used for genuinely empty data
 * as well as sections still being built — never filled with fake numbers.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "lg",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "lg" ? "gap-3 rounded-3xl border border-dashed px-6 py-16" : "gap-2 px-4 py-6",
        className,
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-2xl bg-secondary text-secondary-foreground",
          size === "lg" ? "size-14" : "size-10",
        )}
      >
        <Icon className={size === "lg" ? "size-7" : "size-5"} aria-hidden />
      </span>
      <p className={cn("font-medium", size === "lg" && "text-lg")}>{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
