import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Pantry" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="pantry"
      upcoming={["Add & track items", "Expiry alerts", "What can I make?", "Reservations"]}
    />
  );
}
