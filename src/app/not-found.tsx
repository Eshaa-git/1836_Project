import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That page doesn't exist or has moved."
        action={
          <Button asChild size="lg">
            <Link href="/today">Go to Today</Link>
          </Button>
        }
      />
    </main>
  );
}
