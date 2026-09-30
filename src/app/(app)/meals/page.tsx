import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Meals" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="meals"
      upcoming={["Log by meal", "Skipped vs not logged", "Saved meals", "Search history"]}
    />
  );
}
