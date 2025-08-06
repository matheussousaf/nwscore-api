-- 1) add mainClass to your profile
ALTER TABLE "public"."PlayerProfile"
ADD COLUMN IF NOT EXISTS "mainClass" TEXT;

-- 2) create the per‐class count table
CREATE TABLE IF NOT EXISTS "public"."PlayerClassCount" (
  "playerId"    TEXT    NOT NULL,
  "playerClass" TEXT    NOT NULL,
  "gamesCount"  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PlayerClassCount_pkey" PRIMARY KEY ("playerId","playerClass")
);