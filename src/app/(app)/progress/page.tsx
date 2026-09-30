import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Progress" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="progress"
      upcoming={["Day-end summary", "7 days – 6 months", "Streaks & milestones", "Hydration & sleep"]}
    />
  );
}
