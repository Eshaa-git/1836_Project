-- At most one ACTIVE goal per user (history rows keep other statuses).
CREATE UNIQUE INDEX "goals_one_active_per_user" ON "goals" ("user_id") WHERE "status" = 'ACTIVE';

-- At most one current (open-ended) daily target per user.
CREATE UNIQUE INDEX "daily_targets_one_current_per_user" ON "daily_targets" ("user_id") WHERE "effective_to" IS NULL;

-- Physiologically impossible values are rejected at the database level too.
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_height_range" CHECK ("height_cm" IS NULL OR "height_cm" BETWEEN 50 AND 272);
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_meals_per_day_range" CHECK ("meals_per_day" IS NULL OR "meals_per_day" BETWEEN 1 AND 8);
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_weight_range" CHECK ("weight_kg" IS NULL OR "weight_kg" BETWEEN 20 AND 400);
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_body_fat_range" CHECK ("body_fat_pct" IS NULL OR "body_fat_pct" BETWEEN 2 AND 75);
