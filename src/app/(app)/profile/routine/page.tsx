import type { Metadata } from "next";
import { ProfileSubpage } from "@/features/profile/components/profile-subpage";
import { RoutineForm } from "@/features/profile/components/routine-form";
import { loadProfileForms } from "@/features/profile/data";
import { requireUserContext } from "@/server/auth/session";

export const metadata: Metadata = { title: "Daily routine" };

export default async function RoutinePage() {
  const { routine } = await loadProfileForms(await requireUserContext());
  return (
    <ProfileSubpage title="Daily routine" description="Your day, so meals and reminders fit around it.">
      <RoutineForm initial={routine} />
    </ProfileSubpage>
  );
}
