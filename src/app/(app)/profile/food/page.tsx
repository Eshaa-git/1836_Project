import type { Metadata } from "next";
import { FoodPreferencesForm } from "@/features/profile/components/food-preferences-form";
import { ProfileSubpage } from "@/features/profile/components/profile-subpage";
import { loadProfileForms } from "@/features/profile/data";
import { requireUserContext } from "@/server/auth/session";

export const metadata: Metadata = { title: "Food & restrictions" };

export default async function FoodPage() {
  const { food } = await loadProfileForms(await requireUserContext());
  return (
    <ProfileSubpage
      title="Food & restrictions"
      description="Allergies, intolerances, foods you avoid and other restrictions are kept separate — allergies always come first."
    >
      <FoodPreferencesForm initial={food} />
    </ProfileSubpage>
  );
}
