-- CreateEnum
CREATE TYPE "sex" AS ENUM ('FEMALE', 'MALE', 'INTERSEX', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "measurement_system" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "activity_level" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "diet_type" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'EGGETARIAN', 'VEGAN', 'PESCATARIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "restriction_kind" AS ENUM ('ALLERGY', 'INTOLERANCE', 'AVOID', 'OTHER');

-- CreateEnum
CREATE TYPE "allergy_severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "goal_type" AS ENUM ('FAT_LOSS', 'WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN', 'STRENGTH', 'GENERAL_FITNESS');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('ACTIVE', 'ACHIEVED', 'REPLACED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "goal_metric" AS ENUM ('BODY_WEIGHT_KG', 'BODY_FAT_PCT', 'WAIST_CM', 'WORKOUTS_PER_WEEK', 'NONE');

-- CreateEnum
CREATE TYPE "goal_event_type" AS ENUM ('CREATED', 'UPDATED', 'TIMELINE_EXTENDED', 'ACHIEVED', 'REPLACED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "target_source" AS ENUM ('MANUAL');

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "birth_date" DATE,
    "sex" "sex",
    "height_cm" DECIMAL(5,1),
    "measurement_system" "measurement_system" NOT NULL DEFAULT 'METRIC',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "diet_type" "diet_type",
    "diet_type_other" TEXT,
    "cuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_foods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activity_level" "activity_level",
    "meals_per_day" SMALLINT,
    "wake_time" TEXT,
    "bed_time" TEXT,
    "workout_time" TEXT,
    "workout_duration_min" SMALLINT,
    "workout_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "work_schedule" TEXT,
    "meal_times" JSONB,
    "motivation_why" TEXT,
    "role_model" TEXT,
    "onboarding_completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "measured_at" TIMESTAMPTZ(3) NOT NULL,
    "local_date" DATE NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "body_fat_pct" DECIMAL(4,1),
    "waist_cm" DECIMAL(5,1),
    "hip_cm" DECIMAL(5,1),
    "chest_cm" DECIMAL(5,1),
    "arm_cm" DECIMAL(5,1),
    "thigh_cm" DECIMAL(5,1),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_restrictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "restriction_kind" NOT NULL,
    "allergen_code" TEXT,
    "label" TEXT NOT NULL,
    "severity" "allergy_severity",
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dietary_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "goal_type" NOT NULL,
    "status" "goal_status" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "metric" "goal_metric" NOT NULL DEFAULT 'NONE',
    "start_value" DECIMAL(7,2),
    "target_value" DECIMAL(7,2),
    "start_date" DATE NOT NULL,
    "target_date" DATE,
    "workouts_per_week" SMALLINT,
    "safety_acknowledged_at" TIMESTAMPTZ(3),
    "achieved_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_events" (
    "id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "goal_event_type" NOT NULL,
    "changes" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_milestones" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goal_id" UUID,
    "title" TEXT NOT NULL,
    "value" DECIMAL(7,2),
    "achieved_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_targets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "target_source" NOT NULL DEFAULT 'MANUAL',
    "calories_kcal" INTEGER,
    "protein_g" DECIMAL(6,1),
    "carbs_g" DECIMAL(6,1),
    "fat_g" DECIMAL(6,1),
    "fiber_g" DECIMAL(6,1),
    "water_ml" INTEGER,
    "sleep_hours" DECIMAL(3,1),
    "reason" TEXT,
    "acknowledged_warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "effective_to" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_measurements_user_id_measured_at_idx" ON "body_measurements"("user_id", "measured_at");

-- CreateIndex
CREATE INDEX "dietary_restrictions_user_id_kind_idx" ON "dietary_restrictions"("user_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_restrictions_user_id_kind_label_key" ON "dietary_restrictions"("user_id", "kind", "label");

-- CreateIndex
CREATE INDEX "goals_user_id_status_idx" ON "goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "goal_events_goal_id_created_at_idx" ON "goal_events"("goal_id", "created_at");

-- CreateIndex
CREATE INDEX "goal_events_user_id_created_at_idx" ON "goal_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "goal_milestones_user_id_achieved_at_idx" ON "goal_milestones"("user_id", "achieved_at");

-- CreateIndex
CREATE INDEX "daily_targets_user_id_effective_from_idx" ON "daily_targets"("user_id", "effective_from");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restrictions" ADD CONSTRAINT "dietary_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_events" ADD CONSTRAINT "goal_events_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_events" ADD CONSTRAINT "goal_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_targets" ADD CONSTRAINT "daily_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
