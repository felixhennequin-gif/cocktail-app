-- AlterTable
ALTER TABLE "Category" ADD COLUMN "slug" TEXT;
ALTER TABLE "Category" ADD COLUMN "description" TEXT;

-- Générer les slugs à partir des noms existants (lowercase, espaces → tirets, caractères spéciaux retirés)
UPDATE "Category" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM("name"), '[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ -]', '', 'g'), '[ ]+', '-', 'g'));

-- Rendre slug NOT NULL et UNIQUE après remplissage
ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
