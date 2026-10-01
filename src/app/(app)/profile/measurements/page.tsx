import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasurementForm } from "@/features/profile/components/measurement-form";
import { MeasurementList } from "@/features/profile/components/measurement-list";
import { ProfileSubpage } from "@/features/profile/components/profile-subpage";
import { localDateIn } from "@/server/domain/dates";
import { requireUserContext } from "@/server/auth/session";
import { listMeasurements } from "@/server/services/measurements";
import { getProfileView } from "@/server/services/profile";

export const metadata: Metadata = { title: "Body measurements" };

export default async function MeasurementsPage() {
  const ctx = await requireUserContext();
  const today = localDateIn(ctx.timezone, ctx.now);
  const [profile, measurements] = await Promise.all([
    getProfileView(ctx.userId, today),
    listMeasurements(ctx.userId),
  ]);
  return (
    <ProfileSubpage
      title="Body measurements"
      description="Log whenever you like. Days without an entry are simply unknown — nothing is assumed."
      aside={
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>
              <h2>History</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MeasurementList measurements={measurements} system={profile.measurementSystem} />
          </CardContent>
        </Card>
      }
    >
      <MeasurementForm today={today} system={profile.measurementSystem} />
    </ProfileSubpage>
  );
}
