import type { Route } from "next";
import type { GoalEvaluation } from "@/server/domain/goals/goals";

export type Focus = { title: string; body: string; href: Route; cta: string };

/**
 * Picks the single most useful next step for the Today card. Celebrations and
 * gentle timeline check-ins come first; otherwise fill in what's missing.
 */
export function chooseFocus(input: {
  goalState: GoalEvaluation["state"] | null;
  hasTargets: boolean;
  hasRestrictionsInfo: boolean;
}): Focus {
  if (input.goalState === "achieved") {
    return {
      title: "You reached your goal",
      body: "Take a moment to celebrate, save it as a milestone, and pick what's next.",
      href: "/profile/goal",
      cta: "Celebrate",
    };
  }
  if (input.goalState === "deadline_passed") {
    return {
      title: "Your goal's date has passed",
      body: "Your progress still counts. We can suggest a comfortable new date — nothing gets stricter.",
      href: "/profile/goal",
      cta: "Review timeline",
    };
  }
  if (!input.hasTargets) {
    return {
      title: "Set your daily targets",
      body: "Choose the calories, protein, water and sleep you want to aim for — any you like.",
      href: "/profile/targets",
      cta: "Set targets",
    };
  }
  if (input.goalState === null) {
    return {
      title: "Choose a goal",
      body: "A goal helps us tailor what we suggest. You can change it any time.",
      href: "/profile/goal",
      cta: "Set a goal",
    };
  }
  if (!input.hasRestrictionsInfo) {
    return {
      title: "Tell us how you eat",
      body: "Allergies and preferences are checked before every suggestion.",
      href: "/profile/food",
      cta: "Add preferences",
    };
  }
  return {
    title: "Log what you eat",
    body: "Tell the coach what you've had — it will work out what's left for today.",
    href: "/coach",
    cta: "Open coach",
  };
}
