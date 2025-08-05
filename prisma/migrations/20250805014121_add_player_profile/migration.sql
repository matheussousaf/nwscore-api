-- CreateTable
CREATE TABLE "public"."PlayerProfile" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "companyId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_playerId_key" ON "public"."PlayerProfile"("playerId");

-- CreateIndex
CREATE INDEX "PlayerProfile_playerId_idx" ON "public"."PlayerProfile"("playerId");

-- AddForeignKey
ALTER TABLE "public"."PlayerProfile" ADD CONSTRAINT "PlayerProfile_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerProfile" ADD CONSTRAINT "PlayerProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
