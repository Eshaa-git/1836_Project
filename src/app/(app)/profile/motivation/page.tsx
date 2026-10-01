import type { Metadata } from "next";
import { MotivationForm } from "@/features/profile/components/motivation-form";
import { ProfileSubpage } from "@/features/profile/components/profile-subpage";
import { loadProfileForms } from "@/features/profile/data";
import { requireUserContext } from "@/server/auth/session";

export const metadata: Metadata = { title: "Motivation" };

export default async function MotivationPage() {
  const { motivation } = await loadProfileForms(await requireUserContext());
  return (
    <ProfileSubpage
      title="Motivation"
      description="Why you started — we'll come back to it when you need it."
    >
      <MotivationForm initial={motivation} />
    </ProfileSubpage>
  );
}
