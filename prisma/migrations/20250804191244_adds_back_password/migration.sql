/*
  Warnings:

  - You are about to drop the column `server` on the `PlayerPerformance` table. All the data in the column will be lost.
  - Added the required column `score` to the `PlayerPerformance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `server` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."PlayerPerformance" DROP COLUMN "server",
ADD COLUMN     "score" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "server" TEXT NOT NULL;
