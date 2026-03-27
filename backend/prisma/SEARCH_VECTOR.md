# searchVector — Recherche full-text PostgreSQL

## Contexte

Le champ `searchVector` sur la table `Recipe` est un `tsvector` PostgreSQL géré par des triggers SQL personnalisés (pas par Prisma).

## Triggers SQL

Définis dans `migrations/20260313000000_add_search_vector/migration.sql` :

1. **`recipe_search_vector_update`** — `BEFORE INSERT OR UPDATE OF name, description ON "Recipe"` : recalcule le vecteur quand le nom ou la description change. Inclut les ingrédients via sous-requête.

2. **`recipe_ingredient_search_update`** — `AFTER INSERT OR UPDATE OR DELETE ON "RecipeIngredient"` : recalcule le vecteur de la recette parente quand un ingrédient est ajouté/modifié/supprimé.

3. **Index GIN** — `recipe_search_vector_idx` sur `"Recipe"."searchVector"` pour accélérer les recherches.

## Poids de recherche

- **A** (priorité haute) : `name`
- **B** (priorité moyenne) : `description`
- **C** (priorité basse) : noms des ingrédients

## Important : après `prisma db push --force-reset`

Les triggers et l'index ne sont PAS gérés par Prisma. Après un reset de la base (ex: test), il faut les réappliquer manuellement :

```bash
psql -h localhost -U cocktail_user -d cocktail_test -f prisma/migrations/20260313000000_add_search_vector/migration.sql
```

## Requête de vérification

```sql
-- Vérifier que les triggers existent
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%search%';

-- Vérifier que l'index existe
SELECT indexname FROM pg_indexes WHERE indexname = 'recipe_search_vector_idx';
```
