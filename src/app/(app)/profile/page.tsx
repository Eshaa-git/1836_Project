import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="profile"
      upcoming={["Body measurements", "Goals & history", "Nutrition targets"]}
    />
  );
}
