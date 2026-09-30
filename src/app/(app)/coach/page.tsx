import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "AI Coach" };

export default function Page() {
  return (
    <SectionPlaceholder navKey="coach" upcoming={["Ask about meals", "Pantry ideas", "Weekly summaries"]} />
  );
}
