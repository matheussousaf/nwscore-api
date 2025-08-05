-- DropForeignKey
ALTER TABLE "public"."PlayerPerformance" DROP CONSTRAINT "PlayerPerformance_playerId_fkey";

-- AlterTable
ALTER TABLE "public"."PlayerPerformance" ALTER COLUMN "playerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."PlayerPerformance" ADD CONSTRAINT "PlayerPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
