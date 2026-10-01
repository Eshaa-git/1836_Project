-- CreateEnum
CREATE TYPE "log_source" AS ENUM ('MANUAL', 'SAVED_MEAL', 'COPY', 'CHAT');

-- CreateEnum
CREATE TYPE "meal_mark" AS ENUM ('SKIPPED');

-- DropIndex
DROP INDEX "foods_search_text_trgm";

-- CreateTable
CREATE TABLE "food_log_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "eaten_at" TIMESTAMPTZ(3) NOT NULL,
    "meal_slot" TEXT NOT NULL,
    "food_id" UUID,
    "food_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "portion_label" TEXT,
    "grams" DOUBLE PRECISION NOT NULL,
    "is_estimate" BOOLEAN NOT NULL DEFAULT false,
    "estimate_note" TEXT,
    "source" "log_source" NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "energy_kcal" DOUBLE PRECISION,
    "protein_g" DOUBLE PRECISION,
    "carbs_g" DOUBLE PRECISION,
    "fat_g" DOUBLE PRECISION,
    "fiber_g" DOUBLE PRECISION,
    "sugars_g" DOUBLE PRECISION,
    "saturated_fat_g" DOUBLE PRECISION,
    "cholesterol_mg" DOUBLE PRECISION,
    "sodium_mg" DOUBLE PRECISION,
    "potassium_mg" DOUBLE PRECISION,
    "calcium_mg" DOUBLE PRECISION,
    "iron_mg" DOUBLE PRECISION,
    "magnesium_mg" DOUBLE PRECISION,
    "zinc_mg" DOUBLE PRECISION,
    "vitamin_a_mcg" DOUBLE PRECISION,
    "vitamin_c_mg" DOUBLE PRECISION,
    "vitamin_d_mcg" DOUBLE PRECISION,
    "vitamin_b12_mcg" DOUBLE PRECISION,
    "folate_mcg" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "food_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_slot_marks" (
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "meal_slot" TEXT NOT NULL,
    "mark" "meal_mark" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_slot_marks_pkey" PRIMARY KEY ("user_id","local_date","meal_slot")
);

-- CreateTable
CREATE TABLE "day_logs" (
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "day_logs_pkey" PRIMARY KEY ("user_id","local_date")
);

-- CreateTable
CREATE TABLE "saved_meals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "default_slot" TEXT,
    "last_used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_meal_items" (
    "id" UUID NOT NULL,
    "saved_meal_id" UUID NOT NULL,
    "food_id" UUID,
    "food_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "portion_label" TEXT,
    "grams" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "saved_meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hydration_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "logged_at" TIMESTAMPTZ(3) NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "drink" TEXT NOT NULL DEFAULT 'Water',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hydration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "bedtime_at" TIMESTAMPTZ(3),
    "woke_at" TIMESTAMPTZ(3),
    "duration_min" INTEGER NOT NULL,
    "quality" SMALLINT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sleep_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_log_entries_user_id_local_date_idx" ON "food_log_entries"("user_id", "local_date");

-- CreateIndex
CREATE INDEX "food_log_entries_user_id_eaten_at_idx" ON "food_log_entries"("user_id", "eaten_at");

-- CreateIndex
CREATE INDEX "saved_meals_user_id_idx" ON "saved_meals"("user_id");

-- CreateIndex
CREATE INDEX "saved_meal_items_saved_meal_id_idx" ON "saved_meal_items"("saved_meal_id");

-- CreateIndex
CREATE INDEX "hydration_logs_user_id_local_date_idx" ON "hydration_logs"("user_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_logs_user_id_local_date_key" ON "sleep_logs"("user_id", "local_date");

-- AddForeignKey
ALTER TABLE "food_log_entries" ADD CONSTRAINT "food_log_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_log_entries" ADD CONSTRAINT "food_log_entries_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slot_marks" ADD CONSTRAINT "meal_slot_marks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_logs" ADD CONSTRAINT "day_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_meals" ADD CONSTRAINT "saved_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_saved_meal_id_fkey" FOREIGN KEY ("saved_meal_id") REFERENCES "saved_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hydration_logs" ADD CONSTRAINT "hydration_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Plausibility guards.
ALTER TABLE "food_log_entries" ADD CONSTRAINT "food_log_entries_amounts" CHECK ("quantity" > 0 AND "grams" > 0 AND "grams" <= 5000);
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_amounts" CHECK ("quantity" > 0 AND "grams" > 0 AND "grams" <= 5000);
ALTER TABLE "hydration_logs" ADD CONSTRAINT "hydration_logs_amount" CHECK ("amount_ml" > 0 AND "amount_ml" <= 5000);
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_duration" CHECK ("duration_min" > 0 AND "duration_min" <= 1440);
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_quality" CHECK ("quality" IS NULL OR "quality" BETWEEN 1 AND 5);
-- Saved meal names are unique per user, ignoring case.
CREATE UNIQUE INDEX "saved_meals_user_name_ci" ON "saved_meals" ("user_id", lower("name"));
-- History search by food name.
CREATE INDEX "food_log_entries_food_name_trgm" ON "food_log_entries" USING GIN (lower("food_name") gin_trgm_ops);
