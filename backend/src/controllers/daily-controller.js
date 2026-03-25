const crypto = require('crypto');
const prisma = require('../prisma');
const { includeDetail, computeAvgRating } = require('../helpers/recipe-helpers');
const { redis } = require('../cache');

// GET /recipes/daily — cocktail du jour (déterministe par date)
const getDailyRecipe = async (req, res) => {
  try {
    // Nombre de recettes publiées
    const count = await prisma.recipe.count({ where: { status: 'PUBLISHED' } });
    if (count === 0) {
      return res.status(404).json({ error: 'Aucune recette publiée' });
    }

    // Hash déterministe de la date du jour → index stable pour la journée
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const hash = crypto.createHash('sha256').update(today).digest();
    const index = hash.readUInt32BE(0) % count;

    const [recipe] = await prisma.recipe.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { id: 'asc' },
      skip: index,
      take: 1,
      include: includeDetail,
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recette introuvable' });
    }

    // Données spécifiques à l'utilisateur connecté
    let userFields = {};
    if (req.user) {
      const [fav, userRating] = await Promise.all([
        prisma.favorite.findUnique({
          where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
        }),
        prisma.rating.findUnique({
          where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
        }),
      ]);
      userFields = { isFavorited: !!fav, userScore: userRating?.score ?? null };
    }

    // Mettre en cache Redis manuellement jusqu'à minuit
    if (redis) {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const ttl = Math.max(1, Math.floor((midnight - now) / 1000));
      const cacheKey = 'cocktail:daily-recipe';
      try {
        await redis.setex(cacheKey, ttl, JSON.stringify(computeAvgRating(recipe)));
      } catch {
        // Cache non critique
      }
    }

    const { tags: recipeTags, ratings, ...recipeRest } = recipe;
    const flatTags = recipeTags ? recipeTags.map((rt) => rt.tag) : [];
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
      : null;

    res.json({ ...recipeRest, tags: flatTags, avgRating, ratingsCount: ratings.length, ...userFields });
  } catch (err) {
    console.error('[daily] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getDailyRecipe };
