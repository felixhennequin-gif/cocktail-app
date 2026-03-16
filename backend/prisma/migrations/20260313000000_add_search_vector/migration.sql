-- Ajouter la colonne searchVector sur Recipe
ALTER TABLE "Recipe" ADD COLUMN "searchVector" tsvector;

-- ============================================================
-- Trigger 1 : recalcule le vecteur quand name ou description
--             change sur la table Recipe
-- ============================================================
CREATE OR REPLACE FUNCTION update_recipe_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('french', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(NEW.description, '')), 'B') ||
    setweight(
      to_tsvector('french', coalesce((
        SELECT string_agg(i.name, ' ')
        FROM "RecipeIngredient" ri
        JOIN "Ingredient" i ON i.id = ri."ingredientId"
        WHERE ri."recipeId" = NEW.id
      ), '')),
      'C'
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclenché uniquement sur les colonnes qui influencent le vecteur,
-- pour éviter une récursion quand le trigger 2 met à jour searchVector.
CREATE TRIGGER recipe_search_vector_update
  BEFORE INSERT OR UPDATE OF name, description ON "Recipe"
  FOR EACH ROW EXECUTE FUNCTION update_recipe_search_vector();

-- ============================================================
-- Trigger 2 : recalcule le vecteur de la recette parente quand
--             un RecipeIngredient est ajouté, modifié ou supprimé
-- ============================================================
CREATE OR REPLACE FUNCTION update_search_vector_on_ingredient()
RETURNS trigger AS $$
DECLARE
  affected_id INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_id := OLD."recipeId";
  ELSE
    affected_id := NEW."recipeId";
  END IF;

  -- Met à jour searchVector sans toucher name/description
  -- → ne déclenche PAS le trigger 1 (qui écoute OF name, description)
  UPDATE "Recipe" r
  SET "searchVector" = (
    setweight(to_tsvector('french', coalesce(r.name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(r.description, '')), 'B') ||
    setweight(
      to_tsvector('french', coalesce((
        SELECT string_agg(i.name, ' ')
        FROM "RecipeIngredient" ri
        JOIN "Ingredient" i ON i.id = ri."ingredientId"
        WHERE ri."recipeId" = affected_id
      ), '')),
      'C'
    )
  )
  WHERE r.id = affected_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_ingredient_search_update
  AFTER INSERT OR UPDATE OR DELETE ON "RecipeIngredient"
  FOR EACH ROW EXECUTE FUNCTION update_search_vector_on_ingredient();

-- ============================================================
-- Index GIN pour accélérer les recherches full-text
-- ============================================================
CREATE INDEX recipe_search_vector_idx ON "Recipe" USING GIN("searchVector");

-- ============================================================
-- Peupler les recettes existantes
-- UPDATE OF name déclenche le trigger 1 (ingrédients inclus via subquery)
-- ============================================================
UPDATE "Recipe" SET name = name;
