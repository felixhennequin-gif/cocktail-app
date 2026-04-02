-- CreateTable
CREATE TABLE "TastingLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "notes" TEXT,
    "photoUrl" TEXT,
    "personalRating" INTEGER,
    "adjustments" TEXT,
    "madeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TastingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TastingLog_userId_madeAt_idx" ON "TastingLog"("userId", "madeAt");

-- CreateIndex
CREATE INDEX "TastingLog_recipeId_idx" ON "TastingLog"("recipeId");

-- AddForeignKey
ALTER TABLE "TastingLog" ADD CONSTRAINT "TastingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TastingLog" ADD CONSTRAINT "TastingLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
