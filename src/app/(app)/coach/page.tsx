import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "AI Coach" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="coach"
      upcoming={[
        "Log food by chatting",
        "What should I eat next?",
        "Cook from what you have",
        "Substitutions",
      ]}
    />
  );
}
