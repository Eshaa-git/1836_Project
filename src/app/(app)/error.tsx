"use client";

import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={CloudOff}
      title="Something went wrong"
      description={`We couldn't load this page. Your data is safe.${error.digest ? ` Reference: ${error.digest}` : ""}`}
      action={
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
      }
      className="mt-8"
    />
  );
}
