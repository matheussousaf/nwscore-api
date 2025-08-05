/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Faction" AS ENUM ('Marauders', 'Syndicate', 'Covenant');

-- CreateEnum
CREATE TYPE "public"."WarSideType" AS ENUM ('Attacker', 'Defender');

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "password",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "playerClasses" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."War" (
    "id" TEXT NOT NULL,
    "territory" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "attackerFaction" "public"."Faction" NOT NULL,
    "defenderFaction" "public"."Faction" NOT NULL,
    "winner" "public"."WarSideType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "War_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarSide" (
    "id" TEXT NOT NULL,
    "warId" TEXT NOT NULL,
    "type" "public"."WarSideType" NOT NULL,
    "companyId" TEXT NOT NULL,
    "faction" "public"."Faction" NOT NULL,

    CONSTRAINT "WarSide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerPerformance" (
    "id" TEXT NOT NULL,
    "warSideId" TEXT NOT NULL,
    "playerId" TEXT,
    "nickname" TEXT NOT NULL,
    "playerClass" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "healing" BIGINT NOT NULL,
    "damage" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_leaderId_key" ON "public"."Company"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "WarSide_warId_type_key" ON "public"."WarSide"("warId", "type");

-- CreateIndex
CREATE INDEX "PlayerPerformance_nickname_idx" ON "public"."PlayerPerformance"("nickname");

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."War" ADD CONSTRAINT "War_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."War" ADD CONSTRAINT "War_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarSide" ADD CONSTRAINT "WarSide_warId_fkey" FOREIGN KEY ("warId") REFERENCES "public"."War"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarSide" ADD CONSTRAINT "WarSide_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerPerformance" ADD CONSTRAINT "PlayerPerformance_warSideId_fkey" FOREIGN KEY ("warSideId") REFERENCES "public"."WarSide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerPerformance" ADD CONSTRAINT "PlayerPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
