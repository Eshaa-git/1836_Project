import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Meals" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="meals"
      upcoming={["Daily meal plan", "7 & 14-day plans", "Food logging", "Replace a meal"]}
    />
  );
}
