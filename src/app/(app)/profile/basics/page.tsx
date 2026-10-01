import type { Metadata } from "next";
import { BasicsForm } from "@/features/profile/components/basics-form";
import { ProfileSubpage } from "@/features/profile/components/profile-subpage";
import { loadProfileForms } from "@/features/profile/data";
import { requireUserContext } from "@/server/auth/session";

export const metadata: Metadata = { title: "Your details" };

export default async function BasicsPage() {
  const { basics } = await loadProfileForms(await requireUserContext());
  return (
    <ProfileSubpage title="Your details" description="Age, height, units and timezone.">
      <BasicsForm initial={basics} />
    </ProfileSubpage>
  );
}
