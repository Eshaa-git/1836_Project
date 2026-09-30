import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Progress" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="progress"
      upcoming={["Weight trend", "Consistency", "Strength progress", "Weekly review"]}
    />
  );
}
