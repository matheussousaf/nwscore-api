/*
  Warnings:

  - You are about to drop the column `attackerFaction` on the `War` table. All the data in the column will be lost.
  - You are about to drop the column `defenderFaction` on the `War` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `WarSide` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PlayerPerformance" ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."War" DROP COLUMN "attackerFaction",
DROP COLUMN "defenderFaction";

-- AlterTable
ALTER TABLE "public"."WarSide" DROP COLUMN "score";
