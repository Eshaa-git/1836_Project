import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="settings"
      upcoming={["Units & timezone", "Reminders", "Coaching tone", "Delete account"]}
    />
  );
}
