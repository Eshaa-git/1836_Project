import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Shopping" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="shopping"
      upcoming={["List from your plan", "Check off items", "Add purchases to pantry"]}
    />
  );
}
