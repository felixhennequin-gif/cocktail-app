-- AlterTable: ajouter updatedAt (valeur initiale = createdAt)
ALTER TABLE "Comment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Dédupliquer : garder le commentaire le plus récent par (userId, recipeId)
DELETE FROM "Comment"
WHERE id NOT IN (
  SELECT MAX(id) FROM "Comment" GROUP BY "userId", "recipeId"
);

-- Contrainte d'unicité
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_recipeId_key" UNIQUE ("userId", "recipeId");
