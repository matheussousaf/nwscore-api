/*
  Warnings:

  - You are about to drop the column `server` on the `Player` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nickname,world]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Player_nickname_server_key";

-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "world" TEXT;

-- AlterTable
ALTER TABLE "public"."Player" DROP COLUMN "server",
ADD COLUMN     "world" TEXT;

-- AlterTable
ALTER TABLE "public"."War" ADD COLUMN     "world" TEXT;

-- Drop the existing PlayerClassStats view first
DROP VIEW IF EXISTS "public"."PlayerClassStats";

-- CreateTable
CREATE TABLE "public"."PlayerClassStats" (
    "playerId" TEXT NOT NULL,
    "playerClass" TEXT NOT NULL,
    "avgScore" DOUBLE PRECISION,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "PlayerClassStats_pkey" PRIMARY KEY ("playerId","playerClass")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_nickname_world_key" ON "public"."Player"("nickname", "world");
