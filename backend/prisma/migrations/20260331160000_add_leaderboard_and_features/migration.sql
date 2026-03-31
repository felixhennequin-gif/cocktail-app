-- AlterTable: User — champ opt-out leaderboard
ALTER TABLE "User" ADD COLUMN "showInLeaderboard" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Ingredient — prix estimé
ALTER TABLE "Ingredient" ADD COLUMN "estimatedPricePerUnit" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "unitSize" DOUBLE PRECISION;

-- AlterTable: Collection — collections curées
ALTER TABLE "Collection" ADD COLUMN "isCurated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Collection" ADD COLUMN "curatorName" TEXT;
ALTER TABLE "Collection" ADD COLUMN "curatorBio" TEXT;
ALTER TABLE "Collection" ADD COLUMN "curatorAvatar" TEXT;

-- CreateIndex
CREATE INDEX "Collection_isCurated_idx" ON "Collection"("isCurated");

-- CreateTable: IngredientSubstitution
CREATE TABLE "IngredientSubstitution" (
    "id" SERIAL NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "substituteId" INTEGER NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,

    CONSTRAINT "IngredientSubstitution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngredientSubstitution_ingredientId_substituteId_key" ON "IngredientSubstitution"("ingredientId", "substituteId");

ALTER TABLE "IngredientSubstitution" ADD CONSTRAINT "IngredientSubstitution_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngredientSubstitution" ADD CONSTRAINT "IngredientSubstitution_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UserStreak
CREATE TABLE "UserStreak" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "streakFreezeAvailable" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak"("userId");

ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: RecipeRevision
CREATE TABLE "RecipeRevision" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "authorId" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecipeRevision_recipeId_version_key" ON "RecipeRevision"("recipeId", "version");
CREATE INDEX "RecipeRevision_recipeId_createdAt_idx" ON "RecipeRevision"("recipeId", "createdAt");

-- CreateTable: NewsletterSubscription
CREATE TABLE "NewsletterSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterSubscription_userId_key" ON "NewsletterSubscription"("userId");
CREATE UNIQUE INDEX "NewsletterSubscription_unsubscribeToken_key" ON "NewsletterSubscription"("unsubscribeToken");

ALTER TABLE "NewsletterSubscription" ADD CONSTRAINT "NewsletterSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GlossaryEntry
CREATE TABLE "GlossaryEntry" (
    "id" SERIAL NOT NULL,
    "term" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "longDescription" TEXT,
    "category" TEXT NOT NULL,
    "relatedRecipeIds" INTEGER[],
    "relatedEntryIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlossaryEntry_term_key" ON "GlossaryEntry"("term");
CREATE UNIQUE INDEX "GlossaryEntry_slug_key" ON "GlossaryEntry"("slug");
CREATE INDEX "GlossaryEntry_category_idx" ON "GlossaryEntry"("category");
