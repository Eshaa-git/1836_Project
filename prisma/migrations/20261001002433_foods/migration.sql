-- Fuzzy food search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "food_source" AS ENUM ('USDA_SR_LEGACY', 'CURATED', 'USER');

-- CreateEnum
CREATE TYPE "allergen_assessment" AS ENUM ('ASSESSED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "allergen_presence" AS ENUM ('CONTAINS', 'MAY_CONTAIN');

-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL,
    "source" "food_source" NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_version" TEXT,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "search_text" TEXT NOT NULL,
    "is_estimate" BOOLEAN NOT NULL DEFAULT false,
    "basis" JSONB,
    "allergen_assessment" "allergen_assessment" NOT NULL DEFAULT 'UNVERIFIED',
    "is_common" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_nutrition" (
    "food_id" UUID NOT NULL,
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

    CONSTRAINT "food_nutrition_pkey" PRIMARY KEY ("food_id")
);

-- CreateTable
CREATE TABLE "food_portions" (
    "id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "unit" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "gram_weight" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "is_estimate" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "food_portions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_allergens" (
    "food_id" UUID NOT NULL,
    "allergen_code" TEXT NOT NULL,
    "presence" "allergen_presence" NOT NULL DEFAULT 'CONTAINS',

    CONSTRAINT "food_allergens_pkey" PRIMARY KEY ("food_id","allergen_code")
);

-- CreateIndex
CREATE INDEX "foods_user_id_idx" ON "foods"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "foods_source_source_id_key" ON "foods"("source", "source_id");

-- CreateIndex
CREATE INDEX "food_portions_food_id_idx" ON "food_portions"("food_id");

-- CreateIndex
CREATE INDEX "food_allergens_allergen_code_idx" ON "food_allergens"("allergen_code");

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_nutrition" ADD CONSTRAINT "food_nutrition_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_allergens" ADD CONSTRAINT "food_allergens_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "foods_search_text_trgm" ON "foods" USING GIN ("search_text" gin_trgm_ops);
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_positive" CHECK ("amount" > 0 AND "gram_weight" > 0);
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_source" CHECK (("source" = 'USER') = ("user_id" IS NOT NULL));
