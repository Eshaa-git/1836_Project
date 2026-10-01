import type { Choice } from "@/components/common/choice-chips";
import type {
  ACTIVITY_LEVELS,
  ALLERGY_SEVERITIES,
  DIET_TYPES,
  GOAL_METRICS,
  GOAL_TYPES,
  SEX_VALUES,
  WEEKDAYS,
} from "@/lib/validation/profile";

type Of<T extends readonly string[]> = T[number];

export const SEX_OPTIONS: Choice<Of<typeof SEX_VALUES>>[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "INTERSEX", label: "Intersex" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export const ACTIVITY_OPTIONS: Choice<Of<typeof ACTIVITY_LEVELS>>[] = [
  { value: "SEDENTARY", label: "Mostly sitting", description: "Desk work, little walking" },
  { value: "LIGHT", label: "Lightly active", description: "Some walking or standing" },
  { value: "MODERATE", label: "Moderately active", description: "On your feet a lot, or exercise 3–4×/week" },
  { value: "ACTIVE", label: "Active", description: "Physical job or exercise most days" },
  { value: "VERY_ACTIVE", label: "Very active", description: "Hard training or heavy physical work daily" },
];

export const DIET_OPTIONS: Choice<Of<typeof DIET_TYPES>>[] = [
  { value: "OMNIVORE", label: "I eat everything" },
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "EGGETARIAN", label: "Vegetarian + eggs" },
  { value: "VEGAN", label: "Vegan" },
  { value: "PESCATARIAN", label: "Pescatarian" },
  { value: "OTHER", label: "Other" },
];

export const SEVERITY_OPTIONS: Choice<Of<typeof ALLERGY_SEVERITIES>>[] = [
  { value: "MILD", label: "Mild" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
  { value: "UNKNOWN", label: "Not sure" },
];

export const GOAL_OPTIONS: Choice<Of<typeof GOAL_TYPES>>[] = [
  { value: "FAT_LOSS", label: "Lose fat", description: "Reduce body fat while keeping muscle" },
  { value: "WEIGHT_LOSS", label: "Lose weight", description: "Bring the scale number down" },
  { value: "MAINTENANCE", label: "Maintain", description: "Stay where you are, feel better" },
  { value: "MUSCLE_GAIN", label: "Build muscle", description: "Gain lean mass" },
  { value: "STRENGTH", label: "Get stronger", description: "Lift more, perform better" },
  { value: "GENERAL_FITNESS", label: "General fitness", description: "Move more, build healthy habits" },
];

export const METRIC_LABELS: Record<Of<typeof GOAL_METRICS>, string> = {
  BODY_WEIGHT_KG: "Body weight",
  BODY_FAT_PCT: "Body fat %",
  WAIST_CM: "Waist",
  WORKOUTS_PER_WEEK: "Workouts per week",
  NONE: "No number — just the habit",
};

export const WEEKDAY_OPTIONS: Choice<Of<typeof WEEKDAYS>>[] = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

export const RESTRICTION_COPY = {
  ALLERGY: {
    title: "Allergies",
    description:
      "Foods that cause an allergic reaction. These are strictly excluded from every suggestion — never just avoided.",
  },
  INTOLERANCE: {
    title: "Intolerances",
    description:
      "Foods that upset your digestion (e.g. lactose). We'll leave them out or offer alternatives.",
  },
  AVOID: {
    title: "Foods you avoid",
    description: "Foods you dislike or simply don't eat. We won't suggest them.",
  },
  OTHER: {
    title: "Other restrictions",
    description: "Religious, cultural or personal rules, e.g. halal, no beef, Jain, no alcohol.",
  },
} as const;
