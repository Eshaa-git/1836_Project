"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutOthersButton() {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const { error } = await authClient.revokeOtherSessions();
    setPending(false);
    if (error) toast.error("Couldn't sign out other devices. Please try again.");
    else toast.success("Signed out of all other devices.");
  }

  return (
    <Button variant="outline" size="lg" onClick={onClick} disabled={pending}>
      {pending ? "Signing out…" : "Sign out of other devices"}
    </Button>
  );
}
