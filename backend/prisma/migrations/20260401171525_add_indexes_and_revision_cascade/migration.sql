-- DropIndex (conditional — columns may not exist in all environments)
DROP INDEX IF EXISTS "User_stripeCustomerId_key";
DROP INDEX IF EXISTS "User_stripeSubscriptionId_key";

-- AlterTable (conditional — drop Stripe columns if they exist)
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeCustomerId",
DROP COLUMN IF EXISTS "stripePriceId",
DROP COLUMN IF EXISTS "stripeSubscriptionId",
DROP COLUMN IF EXISTS "subscriptionEnd",
DROP COLUMN IF EXISTS "subscriptionStatus";

-- AlterTable
ALTER TABLE "NewsletterSubscription" ALTER COLUMN "unsubscribeToken" DROP DEFAULT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionRecipe_recipeId_idx" ON "CollectionRecipe"("recipeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RecipeTag_tagId_idx" ON "RecipeTag"("tagId");

-- AddForeignKey
ALTER TABLE "RecipeRevision" ADD CONSTRAINT "RecipeRevision_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
