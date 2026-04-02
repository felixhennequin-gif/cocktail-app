// Helpers partagés pour les controllers liés aux recettes
const prisma = require('../prisma');

// Inclusions des tags (réutilisable)
const includeTags = { tags: { include: { tag: true } } };

// Inclusions pour les vues détaillées (sans charger tous les ratings en mémoire)
const includeDetail = {
  category: true,
  author: {
    select: { id: true, pseudo: true, avatar: true },
  },
  ingredients: {
    include: { ingredient: true },
  },
  steps: {
    orderBy: { order: 'asc' },
  },
  _count: {
    select: { ratings: true },
  },
  parentRecipe: {
    select: { id: true, name: true },
  },
  variants: {
    where: { status: 'PUBLISHED' },
    select: { id: true, name: true, imageUrl: true, difficulty: true, prepTime: true },
  },
  ...includeTags,
};

// Inclusions pour les listes (plus légères, sans charger tous les ratings)
const includeList = {
  category: true,
  author: { select: { id: true, pseudo: true } },
  _count: { select: { ratings: true } },
  ...includeTags,
};

/**
 * Récupère les stats de ratings (avg + count) pour un lot de recettes en une seule requête.
 * Retourne une Map<recipeId, { avgRating, ratingsCount }>.
 */
const batchRatingStats = async (recipeIds) => {
  if (recipeIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw`
    SELECT "recipeId", AVG(score)::float AS avg, COUNT(*)::int AS count
    FROM "Rating"
    WHERE "recipeId" = ANY(${recipeIds}::int[])
    GROUP BY "recipeId"
  `;
  const map = new Map();
  for (const row of rows) {
    map.set(row.recipeId, {
      avgRating: Math.round(Number(row.avg) * 10) / 10,
      ratingsCount: row.count,
    });
  }
  return map;
};

/**
 * Enrichit un lot de recettes avec avgRating/ratingsCount (batch) et aplatit les tags.
 * Remplace l'ancien pattern `recipes.map(computeAvgRating)`.
 */
const enrichRecipes = async (recipes) => {
  if (recipes.length === 0) return [];
  const ids = recipes.map((r) => r.id);
  const stats = await batchRatingStats(ids);
  return recipes.map((recipe) => {
    const { tags, _count, ...rest } = recipe;
    const s = stats.get(recipe.id) || { avgRating: null, ratingsCount: _count?.ratings || 0 };
    return {
      ...rest,
      avgRating: s.avgRating,
      ratingsCount: s.ratingsCount,
      ...(tags ? { tags: tags.map((rt) => rt.tag) } : {}),
    };
  });
};

/**
 * Calcule le coût estimé d'une recette à partir des prix des ingrédients.
 * Retourne null si aucun prix n'est renseigné.
 */
const computeEstimatedCost = (recipe) => {
  if (!recipe.ingredients || recipe.ingredients.length === 0) return null;
  let total = 0;
  let hasPrice = false;
  for (const ri of recipe.ingredients) {
    const ing = ri.ingredient;
    if (ing?.estimatedPricePerUnit && ri.quantity) {
      total += ri.quantity * ing.estimatedPricePerUnit;
      hasPrice = true;
    }
  }
  return hasPrice ? Math.round(total * 100) / 100 : null;
};

/**
 * Aplatit les tags et supprime les champs internes (_count).
 * Pour les cas où avgRating/ratingsCount sont déjà calculés séparément.
 */
const flattenRecipe = (recipe) => {
  const { tags, _count, ...rest } = recipe;
  return {
    ...rest,
    estimatedCost: computeEstimatedCost(recipe),
    ...(tags ? { tags: tags.map((rt) => rt.tag) } : {}),
  };
};

// Convertit les erreurs Prisma connues en réponses HTTP appropriées
const handlePrismaError = (err, res) => {
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Référence invalide : categoryId ou ingredientId inexistant', code: 'BAD_REQUEST' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Recette introuvable', code: 'NOT_FOUND' });
  }
  throw err;
};

module.exports = { includeTags, includeDetail, includeList, batchRatingStats, enrichRecipes, flattenRecipe, computeEstimatedCost, handlePrismaError };
