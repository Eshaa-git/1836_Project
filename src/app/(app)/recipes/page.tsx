import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Recipes" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="recipes"
      upcoming={["Allergy-safe filtering", "Servings scaler", "Cooking-oil adjuster", "Substitutions"]}
    />
  );
}
