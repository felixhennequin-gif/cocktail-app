const prisma = require('../prisma');
const { getCache, setCache } = require('../cache');
const { enrichRecipes } = require('../helpers/recipe-helpers');

// GET /recipes/recommended — recommandations personnalisées pour l'utilisateur connecté
// Stratégie de scoring :
//   1. On exclut les recettes déjà notées par l'utilisateur
//   2. On exclut les recettes contenant des ingrédients bannis
//   3. On score les recettes restantes selon :
//      - La catégorie des recettes les mieux notées par l'utilisateur (+2 points par recette ayant score >= 4)
//      - Les tags des recettes favorites de l'utilisateur (+1 point par tag commun)
//   4. On retourne les 8 meilleures
const getRecommendedRecipes = async (req, res, next) => {
  const userId = req.user.id;
  const cacheKey = `cocktail:recommended:${userId}`;

  try {
    // Vérification du cache
    const cached = await getCache(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }

    // Récupère les préférences, les notes existantes et les favoris en parallèle
    const [prefs, ratedRecipes, favorites] = await Promise.all([
      prisma.userPreference.findUnique({ where: { userId } }),
      prisma.rating.findMany({
        where: { userId },
        include: {
          recipe: {
            select: { categoryId: true, tags: { include: { tag: true } } },
          },
        },
      }),
      prisma.favorite.findMany({
        where: { userId },
        include: {
          recipe: {
            select: { tags: { include: { tag: true } } },
          },
        },
      }),
    ]);

    // IDs des recettes déjà notées (à exclure des recommandations)
    const ratedIds = ratedRecipes.map((r) => r.recipeId);

    // Construction du score de catégorie (catégories bien notées → score +2)
    const categoryScores = {};
    for (const rating of ratedRecipes) {
      if (rating.score >= 4 && rating.recipe?.categoryId) {
        const catId = rating.recipe.categoryId;
        categoryScores[catId] = (categoryScores[catId] || 0) + 2;
      }
    }

    // Construction du score de tags (tags de favoris → score +1)
    const tagScores = {};
    for (const fav of favorites) {
      for (const rt of fav.recipe?.tags ?? []) {
        const tagId = rt.tagId;
        tagScores[tagId] = (tagScores[tagId] || 0) + 1;
      }
    }

    // Ingrédients à exclure (depuis préférences)
    const excludedIngredients = prefs?.excludedIngredients ?? [];

    // Récupère toutes les recettes publiées non encore notées, avec leurs ingrédients et tags
    const candidates = await prisma.recipe.findMany({
      where: {
        status: 'PUBLISHED',
        ...(ratedIds.length > 0 ? { id: { notIn: ratedIds } } : {}),
        // Exclut les recettes avec au moins un ingrédient banni
        ...(excludedIngredients.length > 0
          ? {
              NOT: {
                ingredients: {
                  some: { ingredientId: { in: excludedIngredients } },
                },
              },
            }
          : {}),
      },
      include: {
        category: true,
        author: { select: { id: true, pseudo: true } },
        _count: { select: { ratings: true } },
        tags: { include: { tag: true } },
      },
    });

    // Calcul du score pour chaque recette candidate
    const scored = candidates.map((recipe) => {
      let score = 0;

      // Bonus de catégorie
      if (categoryScores[recipe.categoryId]) {
        score += categoryScores[recipe.categoryId];
      }

      // Bonus de tags
      for (const rt of recipe.tags) {
        if (tagScores[rt.tagId]) {
          score += tagScores[rt.tagId];
        }
      }

      return { recipe, score };
    });

    // Tri par score décroissant, puis par nombre de notes comme critère de départage
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.recipe._count.ratings) - (a.recipe._count.ratings);
    });

    // Prend les 8 meilleures recettes
    const top = scored.slice(0, 8).map((s) => s.recipe);

    // Enrichissement avec avgRating
    const result = await enrichRecipes(top);

    // Mise en cache 5 minutes
    await setCache(cacheKey, result, 300);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getRecommendedRecipes };
