-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
