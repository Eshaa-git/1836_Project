"use client";

import type { Route } from "next";
import { useState } from "react";
import { Plus, Wand2, X } from "lucide-react";
import { ChoiceChips } from "@/components/common/choice-chips";
import { Field, FieldGroup } from "@/components/common/field";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import type { ACTIVITY_LEVELS, WEEKDAYS } from "@/lib/validation/profile";
import { suggestMealTimes, type MealTime } from "@/server/domain/routine/meal-times";
import { saveRoutineAction } from "../actions";
import { ACTIVITY_OPTIONS, WEEKDAY_OPTIONS } from "../labels";
import { useAfterSave } from "../use-after-save";
import { FormFooter } from "./form-footer";

type Activity = (typeof ACTIVITY_LEVELS)[number];
type Weekday = (typeof WEEKDAYS)[number];

export type RoutineInitial = {
  activityLevel: Activity | null;
  mealsPerDay: number | null;
  wakeTime: string | null;
  bedTime: string | null;
  workoutTime: string | null;
  workoutDurationMin: number | null;
  workoutDays: string[];
  workSchedule: string | null;
  mealTimes: MealTime[];
};

const MEAL_COUNTS = ["2", "3", "4", "5", "6"] as const;

export function RoutineForm({
  initial,
  next,
  submitLabel = "Save",
}: {
  initial: RoutineInitial;
  next?: Route;
  submitLabel?: string;
}) {
  const { run, pending, fieldErrors, formError } = useAction(saveRoutineAction);
  const afterSave = useAfterSave(next, "Routine saved");

  const [activityLevel, setActivityLevel] = useState<Activity | null>(initial.activityLevel);
  const [mealsPerDay, setMealsPerDay] = useState<string | null>(
    initial.mealsPerDay ? String(initial.mealsPerDay) : null,
  );
  const [wakeTime, setWakeTime] = useState(initial.wakeTime ?? "");
  const [bedTime, setBedTime] = useState(initial.bedTime ?? "");
  const [workSchedule, setWorkSchedule] = useState(initial.workSchedule ?? "");
  const [workoutDays, setWorkoutDays] = useState<Weekday[]>(initial.workoutDays as Weekday[]);
  const [workoutTime, setWorkoutTime] = useState(initial.workoutTime ?? "");
  const [workoutDuration, setWorkoutDuration] = useState(
    initial.workoutDurationMin ? String(initial.workoutDurationMin) : "",
  );
  const [mealTimes, setMealTimes] = useState<MealTime[]>(initial.mealTimes);

  function suggest(count = mealsPerDay) {
    if (count) setMealTimes(suggestMealTimes(Number(count), wakeTime || null, bedTime || null));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run({
      activityLevel,
      mealsPerDay: mealsPerDay ?? "",
      wakeTime,
      bedTime,
      workoutTime,
      workoutDurationMin: workoutDuration,
      workoutDays,
      workSchedule,
      mealTimes: mealTimes.filter((m) => m.label.trim() && m.time),
    });
    if (result.ok) afterSave();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <FieldGroup legend="How active is a normal day?" optional errors={fieldErrors.activityLevel}>
        <ChoiceChips
          label="Activity level"
          variant="cards"
          options={ACTIVITY_OPTIONS}
          value={activityLevel}
          onChange={setActivityLevel}
          clearable
        />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Usual wake-up time"
          name="wakeTime"
          type="time"
          value={wakeTime}
          onChange={(e) => setWakeTime(e.target.value)}
          errors={fieldErrors.wakeTime}
        />
        <FormField
          label="Usual bedtime"
          name="bedTime"
          type="time"
          value={bedTime}
          onChange={(e) => setBedTime(e.target.value)}
          errors={fieldErrors.bedTime}
        />
      </div>

      <FormField
        label="Work or daily schedule (optional)"
        name="workSchedule"
        value={workSchedule}
        onChange={(e) => setWorkSchedule(e.target.value)}
        placeholder="e.g. Office 9–6 on weekdays, night shifts on weekends"
        errors={fieldErrors.workSchedule}
      />

      <FieldGroup legend="How many times a day do you like to eat?" optional errors={fieldErrors.mealsPerDay}>
        <ChoiceChips
          label="Meals per day"
          options={MEAL_COUNTS.map((n) => ({ value: n, label: `${n} meals` }))}
          value={mealsPerDay as (typeof MEAL_COUNTS)[number] | null}
          onChange={(v) => {
            setMealsPerDay(v);
            if (v && mealTimes.length === 0) suggest(v);
          }}
        />
      </FieldGroup>

      <FieldGroup
        legend="Preferred meal times"
        optional
        description="A flexible guide — eating earlier or later is completely fine."
        errors={fieldErrors.mealTimes}
      >
        {mealTimes.length > 0 && (
          <ul className="space-y-2">
            {mealTimes.map((meal, i) => (
              <li key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Meal ${i + 1} name`}
                  value={meal.label}
                  onChange={(e) =>
                    setMealTimes(mealTimes.map((m, j) => (j === i ? { ...m, label: e.target.value } : m)))
                  }
                  className="h-10"
                />
                <Input
                  aria-label={`Meal ${i + 1} time`}
                  type="time"
                  value={meal.time}
                  onChange={(e) =>
                    setMealTimes(mealTimes.map((m, j) => (j === i ? { ...m, time: e.target.value } : m)))
                  }
                  className="h-10 w-32 shrink-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remove ${meal.label || `meal ${i + 1}`}`}
                  onClick={() => setMealTimes(mealTimes.filter((_, j) => j !== i))}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMealTimes([...mealTimes, { label: "Snack", time: "16:00" }])}
            disabled={mealTimes.length >= 8}
          >
            <Plus aria-hidden /> Add a meal
          </Button>
          <Button type="button" variant="ghost" onClick={() => suggest()} disabled={!mealsPerDay}>
            <Wand2 aria-hidden /> Suggest times from my day
          </Button>
        </div>
      </FieldGroup>

      <FieldGroup legend="Workouts" optional description="Helps us plan meals around your training.">
        <ChoiceChips
          label="Workout days"
          multiple
          options={WEEKDAY_OPTIONS}
          value={workoutDays}
          onChange={setWorkoutDays}
        />
        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <Field label="Usual workout time" htmlFor="workoutTime" errors={fieldErrors.workoutTime}>
            <Input
              id="workoutTime"
              type="time"
              value={workoutTime}
              onChange={(e) => setWorkoutTime(e.target.value)}
              className="h-10"
            />
          </Field>
          <Field
            label="Typical duration (minutes)"
            htmlFor="workoutDuration"
            errors={fieldErrors.workoutDurationMin}
          >
            <Input
              id="workoutDuration"
              inputMode="numeric"
              value={workoutDuration}
              onChange={(e) => setWorkoutDuration(e.target.value)}
              className="h-10"
            />
          </Field>
        </div>
      </FieldGroup>

      <FormFooter error={formError} pending={pending} submitLabel={submitLabel} />
    </form>
  );
}
