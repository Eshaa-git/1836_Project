import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getNavItem } from "@/config/navigation";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { DeleteAccountDialog } from "@/features/account/components/delete-account-dialog";
import { SignOutOthersButton } from "@/features/account/components/sign-out-others-button";
import { requireSessionOrRedirect } from "@/server/auth/session";

export const metadata: Metadata = { title: "Settings" };

const upcoming = ["Reminders", "Units & timezone", "Export your data", "Connected trackers"];

export default async function SettingsPage() {
  const { user } = await requireSessionOrRedirect();
  const item = getNavItem("settings");

  return (
    <div className="space-y-6">
      <PageHeader title={item.label} description={item.description} />

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>
            <h2>Account</h2>
          </CardTitle>
          <CardDescription>
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section aria-labelledby="password-heading" className="max-w-sm space-y-3">
            <h3 id="password-heading" className="font-medium">
              Change password
            </h3>
            <ChangePasswordForm />
          </section>
          <section aria-labelledby="sessions-heading" className="space-y-3">
            <h3 id="sessions-heading" className="font-medium">
              Devices
            </h3>
            <SignOutOthersButton />
          </section>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-destructive/30">
        <CardHeader>
          <CardTitle>
            <h2>Delete account</h2>
          </CardTitle>
          <CardDescription>
            Permanently removes your account and all personal data. A record that an account was deleted is
            kept, without anything that identifies you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>

      <ul className="flex flex-wrap gap-2" aria-label="Coming soon">
        {upcoming.map((feature) => (
          <li key={feature}>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Construction className="size-3" aria-hidden />
              {feature}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
