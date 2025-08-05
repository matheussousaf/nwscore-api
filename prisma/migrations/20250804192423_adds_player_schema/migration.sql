/*
  Warnings:

  - You are about to drop the column `leaderId` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `nickname` on the `PlayerPerformance` table. All the data in the column will be lost.
  - You are about to drop the column `playerClass` on the `PlayerPerformance` table. All the data in the column will be lost.
  - You are about to drop the column `playerClasses` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `server` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[leaderPlayerId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leaderPlayerId` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Made the column `playerId` on table `PlayerPerformance` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Company" DROP CONSTRAINT "Company_leaderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlayerPerformance" DROP CONSTRAINT "PlayerPerformance_playerId_fkey";

-- DropIndex
DROP INDEX "public"."Company_leaderId_key";

-- DropIndex
DROP INDEX "public"."PlayerPerformance_nickname_idx";

-- AlterTable
ALTER TABLE "public"."Company" DROP COLUMN "leaderId",
ADD COLUMN     "leaderPlayerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."PlayerPerformance" DROP COLUMN "nickname",
DROP COLUMN "playerClass",
ALTER COLUMN "playerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "playerClasses",
DROP COLUMN "server";

-- AlterTable
ALTER TABLE "public"."WarSide" ADD COLUMN     "score" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_nickname_server_key" ON "public"."Player"("nickname", "server");

-- CreateIndex
CREATE UNIQUE INDEX "Company_leaderPlayerId_key" ON "public"."Company"("leaderPlayerId");

-- CreateIndex
CREATE INDEX "PlayerPerformance_playerId_idx" ON "public"."PlayerPerformance"("playerId");

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_leaderPlayerId_fkey" FOREIGN KEY ("leaderPlayerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerPerformance" ADD CONSTRAINT "PlayerPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
