import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "Workouts" };

export default function Page() {
  return (
    <SectionPlaceholder
      navKey="workouts"
      upcoming={["Quick “done” logging", "Sets, reps & cardio", "Previous vs today", "Personal bests"]}
    />
  );
}
