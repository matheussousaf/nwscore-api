/*
  Warnings:

  - You are about to drop the column `leaderPlayerId` on the `Company` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[leaderId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leaderId` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Company" DROP CONSTRAINT "Company_leaderPlayerId_fkey";

-- DropIndex
DROP INDEX "public"."Company_leaderPlayerId_key";

-- AlterTable
ALTER TABLE "public"."Company" DROP COLUMN "leaderPlayerId",
ADD COLUMN     "leaderId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Company_leaderId_key" ON "public"."Company"("leaderId");

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
