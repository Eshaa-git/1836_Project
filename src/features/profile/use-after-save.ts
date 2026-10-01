"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** After a successful save: go to `next` (onboarding) or confirm in place (profile editing). */
export function useAfterSave(next: Route | undefined, message = "Saved") {
  const router = useRouter();
  return () => {
    if (next) {
      router.push(next);
    } else {
      toast.success(message);
      router.refresh();
    }
  };
}
